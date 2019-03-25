package io.nrwl.ide.console.ui;

import com.intellij.openapi.actionSystem.ActionGroup;
import com.intellij.openapi.actionSystem.ActionManager;
import com.intellij.openapi.actionSystem.ActionToolbar;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.intellij.uiDesigner.core.GridLayoutManager;
import javafx.application.Platform;
import javafx.embed.swing.JFXPanel;
import javafx.scene.Scene;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

/**
 * Main JPanel used for rendering the NGConsoleUI (the WebView). It uses JavaFX which has a FX WebView to work
 * with  HTML content. Since it takes some time to initialize FX view and to fetch web content as well as to make sure
 * that only once instance exists across the IDE the <code>NgConsoleUI</code> is created as an Application service.
 */
public class NgConsoleUI {
    /**
     * JavaFX object handling web content management such as loading and understanding HTML content. It can apply
     * styles, scripts, etcs.
     */
    private WebEngine myWebEngine;

    /**
     * JavaFX Panel bridging Java and FX world.
     */
    private JFXPanel myWebPanel;

    @NotNull
    private String myInitialUri;


    public NgConsoleUI() {
    }


    public void initWebView() {
        this.myInitialUri = "https://angularconsole.com";
        doInitFX();
    }

    public JComponent getContent() {
        return myWebPanel;
    }

    /**
     * Uses <code>SimpleToolWindowPanel</code> to provide us with toolbar and content layout
     */
    public SimpleToolWindowPanel getToolWindowContent() {
        SimpleToolWindowPanel toolPanel = new SimpleToolWindowPanel(true, true);
        ActionManager actionManager = ActionManager.getInstance();
        ActionToolbar actionToolbar = actionManager.createActionToolbar(
                "toolbar",
                (ActionGroup) actionManager.getAction("NGConsole.UI.Toolbar"),
                true);
        toolPanel.setToolbar(actionToolbar.getComponent());
        toolPanel.setContent(getContent());

        return toolPanel;
    }


    /**
     * There is NPE when changing url.
     * <p>
     * https://youtrack.jetbrains.com/issue/IDEA-199701
     */
    public void goToUrl(final String url) {
        Platform.runLater(() -> myWebEngine.load(url));
    }


    /**
     * JavaFX is tricky in the way that it needs to have these several calls to work properly as we are embedding it
     * inside Swing components.
     * <p>
     * - First we need to make sure that JavaFX runtime will not accidentally shutdown
     * (https://bugs.openjdk.java.net/browse/JDK-8090517) when we release component that is using it and second
     * <p>
     * - Platform.runLater is required to set the run context within JavaFX application thread
     * <p>
     * In case we want to change the layout and embed some additional components such status bar this is the right
     * place to change the GridLayoutManager
     */
    private void doInitFX() {
        myWebPanel = new JFXPanel();
        myWebPanel.setLayout(new GridLayoutManager(1, 1));
        Platform.setImplicitExit(false);
        Platform.runLater(() -> buildWebView());
    }


    private void buildWebView() {
        WebView webView = new WebView();
        myWebEngine = webView.getEngine();
        myWebEngine.setJavaScriptEnabled(true);

        Scene scene = new Scene(webView);
        myWebPanel.setScene(scene);

        myWebEngine.load(myInitialUri);
    }

}
