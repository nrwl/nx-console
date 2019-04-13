package io.nrwl.ide.console.ui.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.ex.ActionManagerEx;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.ServiceManager;
import io.nrwl.ide.console.ui.NgConsoleUI;


/**
 * Action is not currently used
 */
public class GoToAction extends AnAction {


  /**
   * Todo: Adjust action logic once I know more about routing in ng console..
   */
  @Override
  public void actionPerformed(AnActionEvent e) {
    ActionManagerEx actionManager = (ActionManagerEx) e.getActionManager();
    String actionIdPath = actionManager.getLastPreformedActionId();
    String actionId = actionIdPath.replace("NGConsole.", "");

    ApplicationManager.getApplication()
      .invokeLater(() -> {
        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        consoleUI.goToUrl("http://localhost:8888/workspace/%2FUsers%2Ffkolar%2FDesktop%2Fdecorators/projects");
      });
  }


}
