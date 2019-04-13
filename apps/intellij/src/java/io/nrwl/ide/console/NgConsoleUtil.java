package io.nrwl.ide.console;

import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter;
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreterManager;
import com.intellij.notification.*;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.util.EnvironmentUtil;
import io.nrwl.ide.console.server.NgConsoleServer;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;

public class NgConsoleUtil {
  static final NotificationGroup GROUP_NOTIFICATION = new NotificationGroup("AngularConsole",
    NotificationDisplayType.NONE, true);
  @NonNls
  private static final Logger LOG = Logger.getInstance(NgConsoleUtil.class);
  @NonNls
  private static final String ANGULAR_JSON_NAME = "angular.json";
  /**
   * Need to keep reference to the started server as we need to make sure that when whole Application shutdown
   * there are not open node processes
   */
  private static NgConsoleServer ourServer;


  public static NodeJsLocalInterpreter getDefaultNodeInterpreter() throws Exception {
    String userHome = EnvironmentUtil.getValue("HOME");

    List<NodeJsLocalInterpreter> interpreters = NodeJsLocalInterpreterManager.getInstance().getInterpreters();
    if (interpreters.size() > 0) {
      // probably .nvm so pick first under home home
      return interpreters.stream()
        .filter(interpreter -> interpreter.getNpmPackageDir().startsWith(userHome))
        .findFirst().orElse(interpreters.get(0));

    }
    return NodeJsLocalInterpreterManager.getInstance().detectMostRelevant();
  }


  //todo call it workspace
  public static boolean isAngularWorkspace(@NotNull Project project, @Nullable VirtualFile file) {
    return NgConsoleUtil.findAngularCliFolder(project, file) != null;
  }

  /**
   * We need to make sure that when starting a server it is only for the Angular based project. We
   * <p>
   * This code is taken from Angular plugin.
   */
  @Nullable
  @SuppressWarnings("deprecation")
  public static VirtualFile findAngularCliFolder(@NotNull Project project, @Nullable VirtualFile file) {
    VirtualFile current = file;
    while (current != null) {
      if (current.isDirectory() && findCliJson(current) != null) return current;
      current = current.getParent();
    }
    if (findCliJson(project.getBaseDir()) != null) {
      return project.getBaseDir();
    }
    return null;
  }


  /**
   * Iterates over files inside the directory and check for angular.json existence
   */
  @Nullable
  public static VirtualFile findCliJson(@Nullable VirtualFile dir) {
    if (dir == null) return null;
    VirtualFile cliJson = dir.findChild(ANGULAR_JSON_NAME);
    if (cliJson != null) {
      return cliJson;
    }
    return null;
  }


  public static void notify(String message, NotificationType type) {
    ApplicationManager.getApplication().invokeLater(() -> {
      Notification notification = GROUP_NOTIFICATION.createNotification(type);
      notification.setTitle("Angular Console");
      notification.setContent(message);
      Notifications.Bus.notify(notification);
    });


  }
}
