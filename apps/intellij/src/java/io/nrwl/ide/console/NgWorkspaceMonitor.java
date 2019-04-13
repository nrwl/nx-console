package io.nrwl.ide.console;

import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.openapi.wm.ex.ToolWindowEx;
import com.intellij.openapi.wm.ex.ToolWindowManagerEx;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import icons.NgIcons;
import io.nrwl.ide.console.server.NgConsoleServer;
import io.nrwl.ide.console.ui.NgConsoleUI;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import static com.intellij.openapi.wm.ToolWindowAnchor.RIGHT;

/**
 * Application based service in order to record currently opened angular workspaces with ability to start
 * NGConsoleServer with first based angular project and close with last one.
 */
public class NgWorkspaceMonitor implements Disposable {
  private static final Logger LOG = Logger.getInstance(NgWorkspaceMonitor.class);
  private static final String TOOL_WINDOW_ID = "Angular Console";
  private static final String ACTION_ID = "ActivateAngular ConsoleToolWindow";

  private Map<String, Project> myProjects;
  private NgConsoleServer myServer;


  public NgWorkspaceMonitor() {
    myProjects = new HashMap<>();
  }

  /**
   * By default we remove project when project closes but to be sure we really clean up hook into Project Dispose
   * callback.
   */
  public void init(Project project) {
    final String name = project.getName();

    if (myProjects.containsKey(name)) {
      LOG.warn("Inconsistent state. Project is already registered");
    }
    myProjects.put(name, project);

    // Make sure its removed when all is disposed and project is not
    // removed for some reason when project closes.
    Disposer.register(project, () -> {
      myProjects.remove(name);
      stopNgConsole(false);
    });

    if (isRunning()) {
      initWebView();
    } else {
      startNgConsole();
    }

  }


  public void release(Project project) {
    myProjects.remove(project.getName());

    stopNgConsole(false);
  }

  /**
   * Start only server if its Angular based projecs and server hasn't been already
   * started
   */
  private void startNgConsole() {
    if (myServer == null) {
      myServer = new NgConsoleServer();
      myServer.start();
    }
  }

  /**
   * In normal scenario when project closes and calls this method it only recommends
   * shutdown.
   * <p>
   * It shutdowns with last close project
   */
  public void stopNgConsole(boolean force) {
    if (myServer != null && (force || myProjects.size() == 0)) {
      myServer.shutdown();
      myServer = null;
    }
  }

  private boolean isRunning() {
    return myProjects.size() > 0 && myServer != null && myServer.isStarted();
  }


  /**
   * Callback when node process is started or when node process is already up and new workspace is opened and
   * we need to make sure that all the tool windows are visible and initialized across all opened projects.
   *
   *
   * <p>
   * We dont register tool window with plugin.xml but manually here only when process is up and its
   * angular based project
   */
  public void initWebView() {
    myProjects.forEach((name, project) -> {
      final ToolWindowManagerEx projectTw = (ToolWindowManagerEx) ToolWindowManager.getInstance(project);

      if (!project.isDisposed() && projectTw.getToolWindow(TOOL_WINDOW_ID) == null) {
        try {
          NgConsoleUI consoleUI = ServiceManager.getService(project, NgConsoleUI.class);
          String encodedPath = URLEncoder.encode(project.getBasePath(), StandardCharsets.UTF_8.toString());

          consoleUI.goToUrl(String.valueOf(this.myServer.getNodeProcessPort()), encodedPath);
          registerToolWindow(project, consoleUI);

        } catch (Exception e) {
          LOG.error("Problem initWebView when trying to init toolWindow:", e);
        }
      }
    });

  }


  public void onServerStarted() {
    initWebView();
  }

  public void onServerStopped() {
    // some logic here ..
  }


  private void registerToolWindow(final Project project, final NgConsoleUI consoleUI) {
    final ToolWindowManagerEx projectTw = (ToolWindowManagerEx) ToolWindowManager.getInstance(project);

    ApplicationManager.getApplication().invokeAndWait(() -> {
      ToolWindow ngToolWindow = projectTw.registerToolWindow(TOOL_WINDOW_ID, false, RIGHT, project,
        false);

      ngToolWindow.setIcon(NgIcons.TOOL_WINDOW);
      projectTw.hideToolWindow(TOOL_WINDOW_ID, true);

      SimpleToolWindowPanel toolWindowContent = consoleUI.getToolWindowContent();
      ToolWindowEx twEx = (ToolWindowEx) ngToolWindow;

      int width = twEx.getComponent().getWidth();

      ContentFactory contentFactory = ContentFactory.SERVICE.getInstance();
      Content cnt = contentFactory.createContent(toolWindowContent, "", false);
      ngToolWindow.getContentManager().addContent(cnt);
      ngToolWindow.getContentManager().setSelectedContent(cnt);
      twEx.stretchWidth(700 - width);

    });
  }

  public NgConsoleServer getServer() {
    return myServer;
  }

  @Override
  public void dispose() {
    stopNgConsole(true);
    myServer = null;
    myProjects = null;
  }

//    private void setActiveToolWindow() {
//    for (Keymap keymap: KeymapManagerEx.getInstanceEx().getAllKeymaps()) {
//      KeyboardShortcut shortcut = removeFirstKeyboardShortcut(keymap, TODO_TOOLWINDOW_ACTION_ID);
//      if (shortcut != null) {
//        keymap.addShortcut(ANDROID_TOOLWINDOW_ACTION_ID, shortcut);
//      }
//    }
//  }
}
