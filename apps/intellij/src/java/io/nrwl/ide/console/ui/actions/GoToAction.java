package io.nrwl.ide.console.ui.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.ex.ActionManagerEx;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import io.nrwl.ide.console.NgWorkspaceMonitor;


/**
 * Handles Toolbar actions: Workspace, Generate, Tasks, Extensions, Connect, Settings
 */
public class GoToAction extends AnAction {
  private static final Logger LOG = Logger.getInstance(GoToAction.class);


  @Override
  public void actionPerformed(AnActionEvent e) {
    ActionManagerEx actionManager = (ActionManagerEx) e.getActionManager();
    String actionIdPath = actionManager.getLastPreformedActionId();
    String actionId = actionIdPath.replace("NGConsole.", "");

    NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);
    ngMonitor.changeRoute(e.getProject(), actionId);

    LOG.info("Action performed: " + actionId);
  }


}
