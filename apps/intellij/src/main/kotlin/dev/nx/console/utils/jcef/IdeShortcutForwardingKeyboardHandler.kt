package dev.nx.console.utils.jcef

import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.ActionUiKind
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.KeyboardShortcut
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.keymap.KeymapManager
import com.intellij.openapi.project.Project
import java.awt.event.InputEvent
import java.awt.event.KeyEvent
import javax.swing.KeyStroke
import org.cef.browser.CefBrowser
import org.cef.handler.CefKeyboardHandler.CefKeyEvent
import org.cef.handler.CefKeyboardHandlerAdapter

/**
 * Forwards IDE keyboard shortcuts from a JCEF browser back to the IntelliJ action system. Without
 * this, native Chromium consumes the keystroke and IDE shortcuts (e.g. Cmd+4 to toggle the Run tool
 * window) don't fire while the browser is focused.
 *
 * Only shortcuts that clearly target the IDE are forwarded: modifier+digit, modifier+function key,
 * or two-or-more-modifier combinations. Simple editing shortcuts like Cmd+C / Cmd+V stay with the
 * browser.
 */
class IdeShortcutForwardingKeyboardHandler(private val project: Project) :
    CefKeyboardHandlerAdapter() {

    override fun onKeyEvent(browser: CefBrowser?, event: CefKeyEvent): Boolean {
        if (event.type != CefKeyEvent.EventType.KEYEVENT_RAWKEYDOWN) return false

        val awtModifiers = toAwtModifiers(event.modifiers)
        if (!shouldForward(event.windows_key_code, awtModifiers)) return false

        val keyStroke = KeyStroke.getKeyStroke(event.windows_key_code, awtModifiers) ?: return false
        val actionIds =
            KeymapManager.getInstance().activeKeymap.getActionIds(KeyboardShortcut(keyStroke, null))
        if (actionIds.isEmpty()) return false

        val actionManager = ActionManager.getInstance()
        val action = actionIds.firstNotNullOfOrNull { actionManager.getAction(it) } ?: return false

        ApplicationManager.getApplication().invokeLater {
            val dataContext = SimpleDataContext.getProjectContext(project)
            val actionEvent =
                AnActionEvent.createEvent(
                    action,
                    dataContext,
                    null,
                    ActionPlaces.UNKNOWN,
                    ActionUiKind.NONE,
                    null,
                )
            ActionUtil.performAction(action, actionEvent)
        }
        return true
    }

    private fun shouldForward(keyCode: Int, awtModifiers: Int): Boolean {
        val nonShift =
            InputEvent.CTRL_DOWN_MASK or InputEvent.META_DOWN_MASK or InputEvent.ALT_DOWN_MASK
        if (awtModifiers and nonShift == 0) return false
        val isDigit = keyCode in KeyEvent.VK_0..KeyEvent.VK_9
        val isFunctionKey = keyCode in KeyEvent.VK_F1..KeyEvent.VK_F24
        val nonShiftCount = Integer.bitCount(awtModifiers and nonShift)
        val hasShift = awtModifiers and InputEvent.SHIFT_DOWN_MASK != 0
        val hasMultipleModifiers = nonShiftCount > 1 || (hasShift && nonShiftCount >= 1)
        return isDigit || isFunctionKey || hasMultipleModifiers
    }

    private fun toAwtModifiers(cefFlags: Int): Int {
        var mods = 0
        if (cefFlags and EVENTFLAG_SHIFT_DOWN != 0) mods = mods or InputEvent.SHIFT_DOWN_MASK
        if (cefFlags and EVENTFLAG_CONTROL_DOWN != 0) mods = mods or InputEvent.CTRL_DOWN_MASK
        if (cefFlags and EVENTFLAG_ALT_DOWN != 0) mods = mods or InputEvent.ALT_DOWN_MASK
        if (cefFlags and EVENTFLAG_COMMAND_DOWN != 0) mods = mods or InputEvent.META_DOWN_MASK
        return mods
    }

    private companion object {
        const val EVENTFLAG_SHIFT_DOWN = 1 shl 1
        const val EVENTFLAG_CONTROL_DOWN = 1 shl 2
        const val EVENTFLAG_ALT_DOWN = 1 shl 3
        const val EVENTFLAG_COMMAND_DOWN = 1 shl 7
    }
}
