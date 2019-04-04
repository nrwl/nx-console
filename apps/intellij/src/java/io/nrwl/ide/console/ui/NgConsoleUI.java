package io.nrwl.ide.console.ui;

import com.intellij.openapi.application.Application;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.teamdev.jxbrowser.chromium.Browser;
import com.teamdev.jxbrowser.chromium.BrowserContext;
import com.teamdev.jxbrowser.chromium.BrowserContextParams;
import com.teamdev.jxbrowser.chromium.BrowserType;
import com.teamdev.jxbrowser.chromium.swing.BrowserView;

import javax.swing.*;
import java.awt.*;
import java.io.File;
import java.util.HashMap;
import java.util.Map;

import static com.teamdev.jxbrowser.chromium.BrowserPreferences.getDefaultChromiumDir;

/**
 * Main JPanel used for rendering the NGConsoleUI (the WebView). It uses JxBrowser which is a
 * solution built on top of chromium, pretty fast compared JavaFX which I we tried but there
 * is allot of issues with loading svgs, fonts, etcs.
 * <p>
 * But JxBrowser seems to work pretty well.
 */
public class NgConsoleUI {
  private static final Logger LOG = Logger.getInstance(NgConsoleUI.class);


  /**
   * Object representing a Browser build on top of Chromium
   */
  private Browser myBrowser;

  /**
   * Layout container to place a webview into the CENTER zone
   */
  private final JPanel myPanel = new JPanel(new BorderLayout());

  private Map<String, String> myRouteMapping = new HashMap<>();

  private Route myMode = Route.Generate;


  public NgConsoleUI() {
    myRouteMapping.put(Route.Workspace.name(), "http://localhost:%s/workspace/%s");
  }


  public void initWebView(Route mode) {
    this.myMode = mode;
    doInitWebView();
  }

  public JComponent getContent() {
    return myPanel;
  }

  /**
   * Uses <code>SimpleToolWindowPanel</code> to provide us with toolbar and content layout
   */
  public SimpleToolWindowPanel getToolWindowContent() {
    SimpleToolWindowPanel toolPanel = new SimpleToolWindowPanel(true, true);
//    ActionManager actionManager = ActionManager.getInstance();
//    ActionToolbar actionToolbar = actionManager.createActionToolbar(
//      "toolbar",
//      (ActionGroup) actionManager.getAction("NGConsole.UI.Toolbar"),
//      true);
//    toolPanel.setToolbar(actionToolbar.getComponent());
    toolPanel.setContent(getContent());

    return toolPanel;
  }


  /**
   * Make sure first param is port
   *
   */
  public void goToUrl(final String... params) {
    ApplicationManager.getApplication()
      .invokeLater(() -> {
        String url = String.format(myRouteMapping.get(myMode.name()), (Object[])params);

        LOG.info("Switching to new URL : " + url);
        myBrowser.loadURL(url);
      });
  }


  private void doInitWebView() {
    ApplicationManager.getApplication()
      .invokeLater(() -> {

        // Setup unique context Path for the Browser identified by Single IDE APP.
        Application ideApp = ApplicationManager.getApplication();
        long timeStamp = ideApp.getStartTime();

        File dataDir = new File(getDefaultChromiumDir(), "data-" + timeStamp);
        BrowserContextParams bcp = new BrowserContextParams(dataDir.getAbsolutePath());
        BrowserContext bc = new BrowserContext(bcp);

        myBrowser = new Browser(BrowserType.getDefault(), bc);
        BrowserView view = new BrowserView(myBrowser);
        myPanel.add(view, BorderLayout.CENTER);
      });
  }


  public enum Route {
    NewWorkspace,
    Generate,
    Workspace
  }


}
