package io.nrwl.ide.console.ui.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.ex.ActionManagerEx;
import com.intellij.openapi.components.ServiceManager;
import io.nrwl.ide.console.ui.NgConsoleUI;

public class GoToAction extends AnAction {


    /**
     * Todo: Adjust action logic once I know more about routing in ng console..
     */
    @Override
    public void actionPerformed(AnActionEvent e) {
        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        ActionManagerEx actionManager = (ActionManagerEx) e.getActionManager();
        String actionIdPath = actionManager.getLastPreformedActionId();
        String actionId = actionIdPath.replace("NGConsole.", "");


        consoleUI.goToUrl("http://metaui.io");
//        consoleUI.goToUrl("https://www.google.com/search?q=Angular+Console+" + actionId);
    }


}
