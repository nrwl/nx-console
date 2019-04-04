package io.nrwl.ide.console.server;

import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import io.nrwl.ide.console.NgConsoleUtil;
import io.nrwl.ide.console.ui.NgConsoleUI;
import org.jetbrains.io.jsonRpc.JsonRpcServer;

import java.net.URLEncoder;

import static com.intellij.notification.NotificationType.ERROR;
import static com.intellij.notification.NotificationType.INFORMATION;
import static com.intellij.openapi.util.io.FileUtil.toSystemDependentName;

public class RPCHandlerListener {
  private static final Logger LOG = Logger.getInstance(NgConsoleServer.class);

  private JsonRpcServer myRpcServer;
  private NgConsoleServer myServer;


  public RPCHandlerListener(JsonRpcServer rpcServer, NgConsoleServer ngConsoleServer) {
    myRpcServer = rpcServer;
    myServer = ngConsoleServer;
  }


  public void serverStarted(String port) {
    LOG.info("RPCHandlerListener: serverStarted on port: " + port);
    NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);

    String encodedPath = URLEncoder.encode(myServer.geProjectDir());
    consoleUI.goToUrl("http://localhost:" + port + "/workspace/" + encodedPath);

    NgConsoleUtil.notify("NgConsole has been started", INFORMATION);
  }

  public void serverStopped() {
    LOG.info("RPCHandlerListener: serverStopped");

  }


  public void rpcInitialized() {
    LOG.info("JS RPC sub-system is initialized");
    String pathToPlugin = myServer.getServerDir().getAbsolutePath();
    myRpcServer.send(NgConsoleServer.DOMAIN, "start", toSystemDependentName(pathToPlugin));
  }

  public void error(String msg) {
    LOG.info("RPCHandlerListener: error = " + msg);

    NgConsoleUtil.notify("NgConsole error: " + msg, ERROR);

  }
}
