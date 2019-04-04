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
import static io.nrwl.ide.console.NgConsoleUtil.getServer;

/**
 * We want start NGConsole Server only if its Angular based project and if its not already started during wizard
 * process (create new project), otherwise shut it down and clean up.
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

    NgConsoleServer defaultServer = getServer();
    if (NgConsoleUtil.isAngularWorkspace(myProject, baseDir) && !defaultServer.isStarted()) {
      try {
        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        consoleUI.initWebView(NgConsoleUI.Route.Workspace);

        LOG.info("Starting NgConsole Server for project directory:" + baseDir.getCanonicalPath());

        defaultServer.setProjectDir(baseDir.getCanonicalPath());
        defaultServer.start();

      } catch (Exception e) {
        LOG.error("Problem starting Ng Console Server ", e);

        NgConsoleUtil.notify("Problem while starting Ng Console Server " +
          e.getLocalizedMessage(), ERROR);

      }
    } else {
      // double check that we shutdown the server if we are not dealing with angular project and server might have
      //  been started
      this.projectClosed();
    }
  }


  /**
   * Stops the server
   */
  @Override
  @SuppressWarnings("deprecation")
  public void projectClosed() {
    VirtualFile baseDir = myProject.getBaseDir();
    if (NgConsoleUtil.isAngularWorkspace(myProject, baseDir) || getServer().isStarted()) {
      LOG.info("Shutting down NgConsole Server for project directory:" + baseDir.getCanonicalPath());
      getServer().shutdown(true);
    }
  }

  @NotNull
  @Override
  public String getComponentName() {
    return NgConsoleProjectLifecycle.class.getSimpleName();
  }


}
