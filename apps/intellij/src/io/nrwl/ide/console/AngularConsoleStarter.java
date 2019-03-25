package io.nrwl.ide.console;

import com.intellij.openapi.components.ProjectComponent;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

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
            LOG.info("Starting NgConsole Server for project directory:" + baseDir.getCanonicalPath());
            NgConsoleUtil.startServer();
        }

//        Notification notification = new Notification("AngularConsole", TOOL_WINDOW, INFORMATION);
//        notification.setTitle("Angular Console");
//        notification.setContent("Project is Open " + contentRoots[0].getCanonicalPath());
//        Notifications.Bus.notify(notification);
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
            NgConsoleUtil.stopServer(true);
        }
    }

    @NotNull
    @Override
    public String getComponentName() {
        return AngularConsoleStarter.class.getSimpleName();
    }

}
