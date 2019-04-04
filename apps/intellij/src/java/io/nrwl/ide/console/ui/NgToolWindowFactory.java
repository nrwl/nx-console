package io.nrwl.ide.console.ui;

import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.openapi.wm.ex.ToolWindowEx;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import org.jetbrains.annotations.NotNull;

/**
 * Window Factory for instantiating ToolWindow JPanel. This tool windows appears on the right
 * side of the IDE and should hold a web view
 */
public class NgToolWindowFactory implements ToolWindowFactory, DumbAware {
  private static final String ID = "Angular Console";

  @Override
  public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
    NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
    SimpleToolWindowPanel toolWindowContent = consoleUI.getToolWindowContent();
    ToolWindowEx tw = (ToolWindowEx) toolWindow;
    int width = tw.getComponent().getWidth();

    ContentFactory contentFactory = ContentFactory.SERVICE.getInstance();
    Content cnt = contentFactory.createContent(toolWindowContent, "", false);
    toolWindow.getContentManager().addContent(cnt);
    toolWindow.getContentManager().setSelectedContent(cnt);
    tw.stretchWidth(700 - width);
  }

}
