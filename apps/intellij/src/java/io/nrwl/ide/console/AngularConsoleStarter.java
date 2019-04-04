package io.nrwl.ide.console;

import com.intellij.openapi.components.ProjectComponent;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import io.nrwl.ide.console.server.NgConsoleServer;
import io.nrwl.ide.console.ui.NgConsoleUI;
import org.jetbrains.annotations.NotNull;

import static com.intellij.notification.NotificationType.ERROR;

/**
 * We want start NGConsole Server only if its Angular based project.
 */
public class AngularConsoleStarter implements ProjectComponent {
  private static final Logger LOG = Logger.getInstance(AngularConsoleStarter.class);
  private Project myProject;


  public AngularConsoleStarter(@NotNull Project project) {
    this.myProject = project;
  }


  /**
   * Starts Angular Console if its angular.json is found
   */
  @Override
  @SuppressWarnings("deprecation")
  public void projectOpened() {
    VirtualFile baseDir = myProject.getBaseDir();

    if (NgConsoleUtil.isAngularWorkspace(myProject, baseDir)) {
      try {

        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        consoleUI.initWebView();

        LOG.info("Starting NgConsole Server for project directory:" + baseDir.getCanonicalPath());
        NgConsoleServer server = new NgConsoleServer(baseDir.getCanonicalPath());
        server.start();

        NgConsoleUtil.setServer(server);

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
      LOG.info("Shutting down NgConsole Server for project directory:" + baseDir.getCanonicalPath());
      NgConsoleUtil.getServer().shutdown(true);
    }
  }

  @NotNull
  @Override
  public String getComponentName() {
    return AngularConsoleStarter.class.getSimpleName();
  }

}
