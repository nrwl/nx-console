package io.nrwl.ide.console;

import com.intellij.openapi.components.ProjectComponent;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import io.nrwl.ide.console.ui.NgConsoleUI;
import org.jetbrains.annotations.NotNull;

import static com.intellij.notification.NotificationType.ERROR;

/**
 * We want start NGConsole Server only if its Angular based project and if its not already started as
 */
public class NgConsoleProjectLifecycle implements ProjectComponent {
  private static final Logger LOG = Logger.getInstance(NgConsoleProjectLifecycle.class);
  private Project myProject;


  public NgConsoleProjectLifecycle(@NotNull Project project) {
    this.myProject = project;
  }


  @Override
  @SuppressWarnings("deprecation")
  public void projectOpened() {
    VirtualFile baseDir = myProject.getBaseDir();

    if (NgConsoleUtil.isAngularWorkspace(myProject, baseDir)) {
      try {
        LOG.info("Starting NgConsole Server for project directory:" + baseDir.getCanonicalPath());

        NgConsoleUI consoleUI = ServiceManager.getService(myProject, NgConsoleUI.class);
        consoleUI.initWebView(NgConsoleUI.Route.Workspace, myProject.getName());

        NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);
        ngMonitor.init(myProject);
      } catch (Exception e) {
        LOG.error("Problem starting Ng Console Server ", e);

        NgConsoleUtil.notify("Problem while starting Ng Console Server " +
          e.getLocalizedMessage(), ERROR);

      }
    }
  }


  /**
   * Stops the server
   */
  @Override
  @SuppressWarnings("deprecation")
  public void projectClosed() {
    VirtualFile baseDir = myProject.getBaseDir();
    if (NgConsoleUtil.isAngularWorkspace(myProject, baseDir)) {
      LOG.info("Sending shutdown to the NgWorkspaceMonitor. Project directory:" + baseDir.getCanonicalPath());

      NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);
      ngMonitor.release(myProject);
    }
  }

  @NotNull
  @Override
  public String getComponentName() {
    return this.myProject.getName();
  }


}
