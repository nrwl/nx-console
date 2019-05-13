package io.nrwl.ide.console.server;

import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import io.nrwl.ide.console.NgConsoleUtil;
import io.nrwl.ide.console.NgWorkspaceMonitor;
import org.jetbrains.io.jsonRpc.JsonRpcServer;

import static com.intellij.notification.NotificationType.ERROR;
import static com.intellij.notification.NotificationType.INFORMATION;
import static com.intellij.openapi.util.io.FileUtil.toSystemDependentName;

public class RPCHandlerListener {
  private static final Logger LOG = Logger.getInstance(NgConsoleServer.class);

  private JsonRpcServer myRpcServer;


  public RPCHandlerListener(JsonRpcServer rpcServer) {
    myRpcServer = rpcServer;
  }


  @SuppressWarnings("deprecation")
  public void serverStarted(String port) {
    LOG.info("RPCHandlerListener: serverStarted on port: " + port);
    NgConsoleUtil.notify("NgConsole has been started", INFORMATION);

    NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);
    NgConsoleServer server = ngMonitor.getServer();

    if (server != null) {
      server.setState(NgConsoleServer.State.STARTED);
      server.setNodeProcessPort(Integer.valueOf(port));
    }

    ngMonitor.onServerStarted();
  }

  public void serverStopped() {
    LOG.info("RPCHandlerListener: serverStopped");
    NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);
    NgConsoleServer server = ngMonitor.getServer();

    if (server != null) {
      server.setState(NgConsoleServer.State.STOPPED);
    }

    ngMonitor.onServerStopped();
  }


  public void rpcInitialized() {
    LOG.info("JS RPC sub-system is initialized");
    NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);

    String pathToPlugin = ngMonitor.getServer().getServerDir().getAbsolutePath();
    myRpcServer.send(NgConsoleServer.DOMAIN, "start", toSystemDependentName(pathToPlugin));
  }

  public void error(String msg) {
    LOG.info("RPCHandlerListener: error = " + msg);
    NgConsoleUtil.notify("NgConsole error: " + msg, ERROR);

    NgWorkspaceMonitor ngMonitor = ServiceManager.getService(NgWorkspaceMonitor.class);
    ngMonitor.onServerStopped();
  }
}
