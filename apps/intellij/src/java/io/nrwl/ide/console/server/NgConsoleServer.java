package io.nrwl.ide.console.server;

import com.intellij.execution.ExecutionException;
import com.intellij.execution.configuration.EnvironmentVariablesData;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.KillableProcessHandler;
import com.intellij.execution.process.ProcessAdapter;
import com.intellij.execution.process.ProcessEvent;
import com.intellij.execution.process.ScriptRunnerUtil;
import com.intellij.javascript.nodejs.NodeCommandLineUtil;
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter;
import com.intellij.lang.javascript.service.JSLanguageServiceUtil;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.util.io.FileUtil;
import com.intellij.util.EnvironmentUtil;
import io.nrwl.ide.console.NgConsoleUtil;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.ide.BuiltInServerManager;
import org.jetbrains.io.jsonRpc.JsonRpcServer;
import org.jetbrains.io.jsonRpc.socket.RpcBinaryRequestHandler;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static com.intellij.openapi.util.NotNullLazyValue.createConstantValue;

/**
 * NgConsoleServer class is the representation of the NGConsole node process and manages all the states. It can
 * exchange RPC based messages with the server in order to react to different start / stop stages of the node
 * process
 */
public class NgConsoleServer implements Disposable {
  protected static final String DOMAIN = "ngConsoleServer";
  @NonNls
  private static final Logger LOG = Logger.getInstance(NgConsoleServer.class);
  private KillableProcessHandler myNgConsoleProcessHandler;
  private ProcessOutputLogger myOutLogger;

  private JsonRpcServer myRpcServer;
  private File myWorkingDir;
  private State myCurrentState = State.IDLE;

  private int myNodeProcessPort = -1;

  private Disposable mySrvDisposer = () -> {
  };

  public NgConsoleServer() {
  }


  public void start() {
    myWorkingDir = JSLanguageServiceUtil.getPluginDirectory(this.getClass(), "ngConsoleCli");
    myRpcServer = RpcBinaryRequestHandler.getRpcServerInstance();

    LOG.debug("Getting getRpcServerInstance for the Java2Js RPC process: " + myRpcServer);
    Disposer.register(this, mySrvDisposer);

    try {
      GeneralCommandLine commandLine = createCommandLine();

      ApplicationManager.getApplication().executeOnPooledThread(() -> {
        LOG.debug(commandLine.toString());
        try {
          myCurrentState = State.STARTING;

          this.myNgConsoleProcessHandler = createProcess();
          myOutLogger = new ProcessOutputLogger(myNgConsoleProcessHandler);
          myOutLogger.startNotify();

          LOG.info("Starting Ng Angular Console: " + myNgConsoleProcessHandler.getCommandLine());

          myNgConsoleProcessHandler.addProcessListener(new ProcessAdapter() {
            @Override
            public void processTerminated(@NotNull ProcessEvent event) {
              LOG.info("Ng Console server" + DOMAIN + "terminated with exit code " + event.getExitCode());

              Disposer.dispose(NgConsoleServer.this);

            }
          });

          myRpcServer.registerDomain(DOMAIN,
            createConstantValue(new RPCHandlerListener(myRpcServer)),
            true, mySrvDisposer);
        } catch (Exception e) {
          LOG.warn(e);
        }
      });
    } catch (Exception e) {
      LOG.warn(e);
    }
  }


  public void shutdown() {
    ApplicationManager.getApplication().invokeLater(() -> {
      if (myNgConsoleProcessHandler != null && !myNgConsoleProcessHandler.isProcessTerminated()) {
        if (myRpcServer != null) {
          myRpcServer.send(DOMAIN, "shutdown");

        }
        ScriptRunnerUtil.terminateProcessHandler(myNgConsoleProcessHandler,
          1000, null);
      }
    });
  }

  @Override
  public void dispose() {

    this.myOutLogger = null;
    this.myRpcServer = null;
    myNgConsoleProcessHandler = null;
  }

  public boolean isStarted() {
    return myCurrentState == State.STARTED && !myNgConsoleProcessHandler.isProcessTerminated();
  }

  private SilentKillableProcessHandler createProcess() {
    try {
      GeneralCommandLine commandLine = ReadAction.compute(() -> {
        try {
          return createCommandLine();
        } catch (ExecutionException e) {
          throw new IOException("Can not create command line", e);
        }
      });
      return new SilentKillableProcessHandler(commandLine);
    } catch (Exception e) {
      throw new IllegalStateException("Unable to create process", e);
    }
  }

  /**
   * This is the main piece where we assemble commandline along with the system npm interpreter in order to start
   * NODE process. We are setting current workingDirectory which is in our case plugin path and the port for the RPC
   * which we use to communicate with the NODE process
   */
  private GeneralCommandLine createCommandLine() throws Exception {
    NodeJsLocalInterpreter interpreter = NgConsoleUtil.getDefaultNodeInterpreter();
    GeneralCommandLine commandLine = new GeneralCommandLine(interpreter.getInterpreterSystemDependentPath());

    EnvironmentVariablesData envData = EnvironmentVariablesData.create(EnvironmentUtil.getEnvironmentMap(),
      true);
    envData.configureCommandLine(commandLine, true);
    NodeCommandLineUtil.configureUsefulEnvironment(commandLine);

    if (myWorkingDir == null) {
      LOG.info("Can not find ngConsole folder");
    }

    Path execPath = Paths.get(myWorkingDir.getPath(), "main.js");
    if (!Files.exists(execPath)) {
      LOG.info("Unable to continue. main.js does not exists!");
      throw new IllegalStateException("Unable to continue. ngConsole-init.js does not exists!");
    }
    commandLine.setWorkDirectory(FileUtil.toSystemDependentName(myWorkingDir.getAbsolutePath()));
    commandLine.addParameter(FileUtil.toSystemDependentName(execPath.toFile().getAbsolutePath()));
    commandLine.addParameter(String.valueOf(BuiltInServerManager.getInstance().getPort()));

    return commandLine;
  }

  File getServerDir() {
    return myWorkingDir;
  }


  public State getState() {
    return myCurrentState;
  }

  public void setState(State myCurrentState) {
    this.myCurrentState = myCurrentState;
  }


  public int getNodeProcessPort() {
    return myNodeProcessPort;
  }

  public void setNodeProcessPort(int myNodeProcessPort) {
    this.myNodeProcessPort = myNodeProcessPort;
  }

  public enum State {
    IDLE,
    STARTING,
    STARTED,
    STOPPED,
    ERROR
  }
}
