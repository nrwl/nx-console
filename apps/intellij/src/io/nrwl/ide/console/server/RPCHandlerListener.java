package io.nrwl.ide.console.server;

import com.intellij.notification.Notification;
import com.intellij.notification.Notifications;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.io.FileUtil;
import io.nrwl.ide.console.ui.NgConsoleUI;
import org.jetbrains.io.jsonRpc.JsonRpcServer;

import static com.intellij.notification.NotificationType.ERROR;
import static com.intellij.notification.NotificationType.INFORMATION;
import static icons.NgIcons.TOOL_WINDOW;

public class RPCHandlerListener {
    private static final Logger LOG = Logger.getInstance(NgConsoleServer.class);

    private JsonRpcServer myRpcServer;
    private NgConsoleServer server;


    public RPCHandlerListener(JsonRpcServer rpcServer, NgConsoleServer ngConsoleServer) {
        myRpcServer = rpcServer;
        server = ngConsoleServer;
    }


    public void serverStarted() {
        LOG.info("RPCHandlerListener: serverStarted");
        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        consoleUI.goToUrl("http://localhost:9800/");

        Notification notification = new Notification("AngularConsole", TOOL_WINDOW, INFORMATION);
        notification.setTitle("Angular Console");
        notification.setContent("NgConsole has been started");
        Notifications.Bus.notify(notification);
    }

    public void serverStopped() {
        LOG.info("RPCHandlerListener: serverStopped");

    }


    public void rpcInitialized() {
        LOG.info("JS RPC sub-system is initialized");
        myRpcServer.send(NgConsoleServer.DOMAIN, "start",
                FileUtil.toSystemDependentName(server.getServerDir().getAbsolutePath()), 9800);
    }

    public void error(String msg) {
        LOG.info("RPCHandlerListener: error");

        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        consoleUI.goToUrl("http://localhost:9800/");

        Notification notification = new Notification("AngularConsole", TOOL_WINDOW, ERROR);
        notification.setTitle("Angular Console");
        notification.setContent("NgConsole error: " + msg);
        Notifications.Bus.notify(notification);
    }
}
