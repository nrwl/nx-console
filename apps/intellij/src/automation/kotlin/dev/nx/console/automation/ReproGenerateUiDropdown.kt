package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.elements.JListUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.Rectangle
import java.awt.event.InputEvent
import java.awt.event.MouseEvent
import java.nio.file.Path
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("javax.swing.JList")
interface DropdownGeneratorList {
    fun setSelectedIndex(index: Int)
}

@Remote("com.intellij.openapi.ui.popup.util.PopupUtil")
interface DropdownPopupUtil {
    fun getPopupContainerFor(component: Component): DropdownPopup?
}

@Remote("com.intellij.openapi.ui.popup.JBPopup")
interface DropdownPopup {
    fun closeOk(event: InputEvent?)
}

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface DropdownFrame {
    fun setExtendedState(state: Int)

    fun setBounds(x: Int, y: Int, width: Int, height: Int)

    fun toFront()

    fun getBalloonLayout(): DropdownBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface DropdownBalloonLayout {
    fun closeAll()
}

@Remote("java.awt.event.MouseEvent") interface DropdownMouseEvent

@Remote("java.awt.Component")
interface DropdownBrowserComponent {
    fun dispatchEvent(event: DropdownMouseEvent)

    fun getWidth(): Int

    fun getHeight(): Int
}

@Remote("java.lang.Class")
interface DropdownJavaClass {
    fun getDeclaredField(name: String): DropdownField

    fun getSuperclass(): DropdownJavaClass?

    fun getName(): String
}

@Remote("java.lang.reflect.Field")
interface DropdownField {
    fun setAccessible(accessible: Boolean)

    fun get(receiver: DropdownReflected?): DropdownReflected?

    fun getBoolean(receiver: DropdownReflected?): Boolean
}

/** The same field, for values Driver copies back by value (primitives, java.awt.Rectangle). */
@Remote("java.lang.reflect.Field")
interface DropdownValueField {
    fun get(receiver: DropdownReflected?): Any?
}

@Remote("java.lang.Object")
interface DropdownReflected {
    fun getClass(): DropdownJavaClass

    override fun toString(): String
}

private const val GENERATE_UI_ACTION = "dev.nx.console.generate.actions.NxGenerateUiAction"
private const val GENERATOR_ROW = "@fixture/notes-plugin - note"
private const val FIELD = "unitTestRunner"

private data class ListBounds(val source: String, val top: Int, val bottom: Int)

private fun waitUntil(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(250)
    }
}

private fun Driver.js(script: String): String = ui.jcef().jcefWorker.callJs(script, 5000)

private fun Driver.chooseGenerator(frame: Component) {
    invokeAction(GENERATE_UI_ACTION, component = frame)
    var items = emptyList<String>()
    waitUntil(60.seconds, { "The generator popup never listed $GENERATOR_ROW; saw $items" }) {
        ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().any { list ->
            runCatching {
                    items = list.items
                    val index = items.indexOfFirst { it.startsWith(GENERATOR_ROW) }
                    if (index < 0) return@runCatching false
                    withContext(OnDispatcher.EDT) {
                        cast(list.component, DropdownGeneratorList::class).setSelectedIndex(index)
                        checkNotNull(
                                utility<DropdownPopupUtil>().getPopupContainerFor(list.component)
                            )
                            .closeOk(null)
                    }
                    true
                }
                .getOrDefault(false)
        }
    }
}

/**
 * Clicks inside the webview by dispatching AWT mouse events to the JCEF component in the IDE
 * process. JCEF forwards them to Chromium as real input, so the page sees a trusted click, but
 * nothing goes through the OS.
 */
private fun Driver.clickInBrowser(browser: Component, x: Int, y: Int) {
    listOf(MouseEvent.MOUSE_PRESSED, MouseEvent.MOUSE_RELEASED, MouseEvent.MOUSE_CLICKED).forEach {
        id ->
        val event =
            new(
                DropdownMouseEvent::class,
                browser,
                id,
                System.currentTimeMillis(),
                InputEvent.BUTTON1_DOWN_MASK,
                x,
                y,
                1,
                false,
                MouseEvent.BUTTON1,
            )
        withContext(OnDispatcher.EDT) {
            cast(browser, DropdownBrowserComponent::class).dispatchEvent(event)
        }
        Thread.sleep(60)
    }
}

/** Finds a private field of the JCEF off-screen handler, walking up to the declaring class. */
private fun <T> Driver.withOsrHandlerField(
    browser: Component,
    name: String,
    read: (DropdownField, DropdownReflected) -> T,
): T? =
    withContext(OnDispatcher.EDT) {
        val component = cast(browser, DropdownReflected::class)
        val handlerField = component.getClass().getDeclaredField("myRenderHandler")
        handlerField.setAccessible(true)
        val handler = handlerField.get(component) ?: return@withContext null
        var type: DropdownJavaClass? = handler.getClass()
        while (type != null) {
            val field = runCatching { type.getDeclaredField(name) }.getOrNull()
            if (field != null) {
                field.setAccessible(true)
                return@withContext read(field, handler)
            }
            type = type.getSuperclass()
        }
        null
    }

/**
 * Where the open dropdown's option list is, in browser view pixels. A native `<select>` popup is
 * painted by Chromium into the off-screen view, so its bounds come from JCEF's render handler. An
 * in-page listbox reports its own DOM rectangle.
 */
private fun Driver.openListBounds(browser: Component): ListBounds? {
    val dom =
        js(
            """(() => {
              const host = document.querySelector('[id="$FIELD-field"]');
              const list = host?.shadowRoot?.querySelector('.listbox');
              if (!host?.open || !list) return '';
              const r = list.getBoundingClientRect();
              return Math.round(r.top) + ',' + Math.round(r.bottom);
            })()"""
        )
    if (dom.isNotBlank()) {
        val (top, bottom) = dom.split(',').map { it.toInt() }
        return ListBounds("in-page listbox", top, bottom)
    }
    val shown =
        withOsrHandlerField(browser, "myPopupShown") { field, handler -> field.getBoolean(handler) }
    if (shown != true) return null
    val bounds =
        withOsrHandlerField(browser, "myPopupBounds") { field, handler ->
            cast(field, DropdownValueField::class).get(handler) as? Rectangle
        } ?: return null
    return ListBounds("native <select> popup", bounds.y, bounds.y + bounds.height)
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "generate-ui-dropdown-fixture")
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, DropdownFrame::class).apply {
            setExtendedState(0)
            setBounds(40, 40, 1280, 860)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    runCatching { closeToolWindow("Project") }

    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "issue-2053-repro"
    val report = StringBuilder()
    report.appendLine("Issue #2053: Generate UI dropdown at the bottom of the form")
    report.appendLine("Generator: $GENERATOR_ROW, field: $FIELD (enum vitest/jest/none)")
    recordIde(label) {
        chooseGenerator(frame)
        waitUntil(60.seconds, { "The Generate UI form did not render $FIELD" }) {
            runCatching { js("""String(document.querySelector('[id="$FIELD-field"]') !== null)""") }
                .getOrNull() == "true"
        }
        Thread.sleep(1500)
        // The off-screen rendering component inside JBCefBrowser's panel receives input and paints.
        val browser = ui.jcef().x("//div[@class='JBCefOsrComponent']").component
        val viewHeight =
            withContext(OnDispatcher.EDT) {
                cast(browser, DropdownBrowserComponent::class).getHeight()
            }
        val showMore =
            js(
                """(() => {
                  const toggle = document.querySelector('[data-cy="show-more"]');
                  if (!toggle) return '';
                  toggle.scrollIntoView({ block: 'center' });
                  const r = toggle.getBoundingClientRect();
                  return Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2);
                })()"""
            )
        if (showMore.isNotBlank()) {
            val (x, y) = showMore.split(',').map { it.toInt() }
            clickInBrowser(browser, x, y)
        }
        waitUntil(10.seconds, { "The $FIELD field stayed hidden behind 'Show more'" }) {
            js(
                """String(document.querySelector('[id="$FIELD-field"]').getClientRects().length > 0)"""
            ) == "true"
        }
        Thread.sleep(1000)
        // Scroll the field to the bottom edge of the webview, where the report's screenshot has it.
        val fieldRect =
            js(
                """(() => {
                  const field = document.querySelector('[id="$FIELD-field"]');
                  field.scrollIntoView({ block: 'end' });
                  const r = field.getBoundingClientRect();
                  return [r.left, r.top, r.width, r.height, window.innerHeight, field.tagName]
                    .map((v) => typeof v === 'number' ? Math.round(v) : v).join(',');
                })()"""
            )
        report.appendLine("Field rect (left,top,width,height,innerHeight,tag): $fieldRect")
        report.appendLine(
            "Browser component height: $viewHeight, devicePixelRatio: ${js("String(window.devicePixelRatio)")}"
        )
        val parts = fieldRect.split(',')
        val (left, top, width, height, innerHeight) = parts.take(5).map { it.toInt() }
        Thread.sleep(1500)
        clickInBrowser(browser, left + width / 2, top + height / 2)

        var bounds: ListBounds? = null
        waitUntil(10.seconds, { "Clicking $FIELD did not open a dropdown list\n$report" }) {
            bounds = openListBounds(browser)
            bounds != null
        }
        Thread.sleep(2500)
        val list = checkNotNull(bounds)
        report.appendLine(
            "Open list (${list.source}): top=${list.top} bottom=${list.bottom}, webview height=$innerHeight"
        )
        val hidden = maxOf(0, list.bottom - innerHeight) + maxOf(0, -list.top)
        report.appendLine("List pixels outside the webview: $hidden")

        // Pick the last option by clicking where it is drawn, as a user would.
        if (hidden == 0) {
            clickInBrowser(browser, left + width / 2, list.bottom - 12)
            Thread.sleep(1500)
        }
        val value = js("""String(document.querySelector('[id="$FIELD-field"]')?.value ?? '')""")
        report.appendLine("Field value after clicking the last visible row: '$value'")
        Thread.sleep(1500)
        println(report)
        automationOutput()
            .resolve("$label-${System.currentTimeMillis()}.txt")
            .writeText(report.toString())
        check(hidden == 0) { "The dropdown list is cut off by the webview's bottom edge:\n$report" }
        check(value == "none") { "The last option could not be chosen from the list:\n$report" }
    }
}
