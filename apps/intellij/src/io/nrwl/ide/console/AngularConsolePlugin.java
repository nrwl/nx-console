package io.nrwl.ide.console;

import com.intellij.openapi.components.ApplicationComponent;
import com.intellij.openapi.components.ServiceManager;
import io.nrwl.ide.console.ui.NgConsoleUI;
import org.jetbrains.annotations.NotNull;

/**
 * Application level component used to pre-instantiate FX subsystem as the bootstrapping it takes quite some time. We
 * also need to make sure we shutdown Node thread so before application closes we do last check.
 * <p>
 * Todo: Need to test this more as if I KILL the IDEA process the NODE process is still running
 * <p>
 * <p>
 * Flow:
 * <p>
 * - When Idea starts and project is opened the AngularConsoleStarter project level component kick-in.
 * - We need to check if we are dealing with Angular project and if Yes then we can start the background node thread.
 * <p>
 * - The NgConsoleServer create new process and also setups a communication channel using RPC so Java can talk to NODE
 * and back
 * - Once the process is initialized the RPCHandlerListener gets notified and at this moment we are ready to tell NODE
 * process start the AngularApp server
 * - Once Server is started RPCHandlerListener is notified and we refresh the current URL that is set inside FX WebView
 * <p>
 * - When we close project then inside the AngularConsoleStarter.projectClosed we shutdown the process and release it
 * - We also listen for Application Dispose as a last stand to make sure there are now process running.
 */
@SuppressWarnings({"deprecation"})
public class AngularConsolePlugin implements ApplicationComponent {


    @Override
    public void initComponent() {
        // pre-instantiate FX webview as it takes some time
        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        consoleUI.initWebView();

    }

    @Override
    public void disposeComponent() {
        // make sure that is no unclosed process
        NgConsoleUtil.stopServer(false);
    }

    @NotNull
    @Override
    public String getComponentName() {
        return AngularConsolePlugin.class.getSimpleName();
    }
}
