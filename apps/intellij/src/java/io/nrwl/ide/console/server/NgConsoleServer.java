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
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.io.FileUtil;
import com.intellij.util.EnvironmentUtil;
import com.intellij.util.io.BaseOutputReader;
import io.nrwl.ide.console.NgConsoleUtil;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.ide.BuiltInServerManager;
import org.jetbrains.io.jsonRpc.JsonRpcServer;
import org.jetbrains.io.jsonRpc.socket.RpcBinaryRequestHandler;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static com.intellij.openapi.util.NotNullLazyValue.createConstantValue;

/**
 * NgConsoleServer represent
 */
public class NgConsoleServer {
  @NonNls
  private static final Logger LOG = Logger.getInstance(NgConsoleServer.class);
  protected static final String DOMAIN = "ngConsoleServer";

  private KillableProcessHandler myNgConsoleProcessHandler;
  private ProcessOutputLogger myOutLogger;

  private JsonRpcServer myRpcServer;
  private File myWorkingDir;
  private String myProjectDir;


  public NgConsoleServer(String projectDir) throws Exception {
    myProjectDir = projectDir;
    myWorkingDir = JSLanguageServiceUtil.getPluginDirectory(this.getClass(), "ngConsoleCli");

    LOG.info("Getting getRpcServerInstance for the Java2Js RPC process");
    myRpcServer = RpcBinaryRequestHandler.getRpcServerInstance();
    LOG.info("Getting getRpcServerInstance for the Java2Js RPC process: " + myRpcServer);
  }

  public void start() {

    try {
      GeneralCommandLine commandLine = createCommandLine();

      ApplicationManager.getApplication().executeOnPooledThread(() -> {
        LOG.debug(commandLine.toString());
        try {
          this.myNgConsoleProcessHandler = createProcess();

          myOutLogger = new ProcessOutputLogger(myNgConsoleProcessHandler);
          myOutLogger.startNotify();

          LOG.info("Ng Console started successfully: " + myNgConsoleProcessHandler.getCommandLine());

          myNgConsoleProcessHandler.addProcessListener(new ProcessAdapter() {
            @Override
            public void processTerminated(@NotNull ProcessEvent event) {
              LOG.info("Ng Console server terminated with exit code " + event.getExitCode());
            }
          });

          myRpcServer.registerDomain(DOMAIN,
            createConstantValue(new RPCHandlerListener(myRpcServer, this)),
            false, null);
        } catch (Exception e) {
          LOG.warn(e);
        }
      });
    } catch (Exception e) {
      LOG.warn(e);
    }
  }

  public void shutdown(boolean async) {

    Runnable action = () -> {
      if (!myNgConsoleProcessHandler.isProcessTerminated()) {
        if (myRpcServer != null) {
          myRpcServer.send(DOMAIN, "shutdown");

          myRpcServer = null;
        }
        ScriptRunnerUtil.terminateProcessHandler(myNgConsoleProcessHandler,
          1000, null);
      }
    };

    if (async) {
      ApplicationManager.getApplication().invokeLater(action);
    } else {
      action.run();
    }
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
   * This  the main piece where we assemble commandline along with the system npm interpreter in order to start
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

  String geProjectDir() {
    return myProjectDir;
  }


  private static class SilentKillableProcessHandler extends KillableProcessHandler {

    public SilentKillableProcessHandler(@NotNull GeneralCommandLine commandLine)
      throws ExecutionException {
      super(commandLine);
    }

    public SilentKillableProcessHandler(@NotNull GeneralCommandLine commandLine,
                                        boolean withMediator) throws ExecutionException {
      super(commandLine, withMediator);
    }

    public SilentKillableProcessHandler(@NotNull Process process, String commandLine) {
      super(process, commandLine);
    }

    public SilentKillableProcessHandler(@NotNull Process process, String commandLine,
                                        @NotNull Charset charset) {
      super(process, commandLine, charset);
    }

    @NotNull
    @Override
    protected BaseOutputReader.Options readerOptions() {
      return BaseOutputReader.Options.forMostlySilentProcess();
    }

  }
}
