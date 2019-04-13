package io.nrwl.ide.console.ui;

import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.teamdev.jxbrowser.chromium.Browser;
import com.teamdev.jxbrowser.chromium.BrowserContext;
import com.teamdev.jxbrowser.chromium.BrowserContextParams;
import com.teamdev.jxbrowser.chromium.BrowserType;
import com.teamdev.jxbrowser.chromium.events.FinishLoadingEvent;
import com.teamdev.jxbrowser.chromium.events.LoadAdapter;
import com.teamdev.jxbrowser.chromium.swing.BrowserView;

import javax.swing.*;
import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static com.teamdev.jxbrowser.chromium.BrowserPreferences.getDefaultChromiumDir;

/**
 * Main JPanel used for rendering the NGConsoleUI (the WebView). It uses JxBrowser which is a
 * solution built on top of chromium, pretty fast compared JavaFX which I we tried but there
 * is allot of issues with loading svgs, fonts, etcs.
 * <p>
 * But JxBrowser seems to work pretty well.
 */
public class NgConsoleUI implements Disposable {
  private static final Logger LOG = Logger.getInstance(NgConsoleUI.class);
  /**
   * Layout container to place a webview into the CENTER zone
   */
  private final JPanel myPanel = new JPanel(new BorderLayout());
  /**
   * Object representing a Browser build on top of Chromium
   */
  private Browser myBrowser;
  private Map<String, String> myRouteMapping = new HashMap<>();

  private Route myRoute = Route.Generate;


  public NgConsoleUI() {
    myRouteMapping.put(Route.Workspace.name(), "http://localhost:%s/workspace/%s");
    LOG.info("NGConsoleUI = " + System.identityHashCode(this));
  }


  /**
   * We are using project name to have unique JxBrowser BrowserContext lock file
   */
  public void initWebView(Route mode, String name) {
    this.myRoute = mode;
    doInitWebView(name);
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
   */
  public void goToUrl(final String... params) {
    final String url = String.format(myRouteMapping.get(myRoute.name()), (Object[]) params);
    LOG.info("Switching to new URL : " + url);

    while (!loadAndWait(url)) {
      try {
        Thread.sleep(800);
      } catch (InterruptedException e) {
      }
    }
  }


  private synchronized boolean loadAndWait(String url) {
    boolean success = false;

    CountDownLatch countDown = new CountDownLatch(1);
    ErrorAwareLoader loader = new ErrorAwareLoader(countDown);

    myBrowser.addLoadListener(loader);

    try {
      myBrowser.loadURL(url);
      try {
        if (!countDown.await((long) 20, TimeUnit.SECONDS)) {
          throw new RuntimeException(new TimeoutException());
        }
      } catch (InterruptedException var7) {
        Thread.currentThread().interrupt();
      }

      success = !loader.hasError();
    } finally {
      if (myBrowser != null) {
        myBrowser.removeLoadListener(loader);
      }

    }
    return success;
  }


  private void doInitWebView(String name) {

    ApplicationManager.getApplication()
      .invokeAndWait(() -> {
        File dataDir = null;
        try {
          dataDir = new File(getDefaultChromiumDir(), "data-" + name);
          if (dataDir.exists()) {
            Path path = dataDir.toPath();
            Files.walk(path).sorted(Comparator.reverseOrder()).map(Path::toFile)
              .forEach(file -> {
                if (file != null && file.exists()) {
                  file.delete();
                }
              });
          }
        } catch (IOException e) {
//          System.out.println("e = " + e);
        }

        BrowserContextParams bcp = new BrowserContextParams(dataDir.getAbsolutePath());
        BrowserContext bc = new BrowserContext(bcp);

        myBrowser = new Browser(BrowserType.LIGHTWEIGHT, bc);
        BrowserView view = new BrowserView(myBrowser);
        myPanel.add(view, BorderLayout.CENTER);
      });
  }

  @Override
  public void dispose() {
    if (myBrowser != null) {
      ApplicationManager.getApplication().invokeAndWait(() -> {
        myBrowser.dispose();
        myBrowser = null;
      });
    }
  }


  public enum Route {
    NewWorkspace,
    Generate,
    Workspace
  }

  private static class ErrorAwareLoader extends LoadAdapter {
    private CountDownLatch myLatch;
    private boolean error = false;

    public ErrorAwareLoader(CountDownLatch latch) {
      super();
      myLatch = latch;
    }

    @Override
    public void onFinishLoadingFrame(FinishLoadingEvent event) {
      if (event.isMainFrame()) {
        error = event.getValidatedURL().contains("chrome-error:");
        this.myLatch.countDown();
      }
    }

    public boolean hasError() {
      return error;
    }
  }


}
