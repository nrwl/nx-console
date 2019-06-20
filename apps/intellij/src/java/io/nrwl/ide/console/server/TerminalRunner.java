package io.nrwl.ide.console.server;

import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.configurations.PtyCommandLine;
import com.intellij.execution.process.*;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.util.Key;
import com.intellij.openapi.util.SystemInfoRt;
import io.nrwl.ide.console.NgWorkspaceMonitor;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.io.jsonRpc.JsonRpcServer;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static com.intellij.execution.configurations.GeneralCommandLine.ParentEnvironmentType.CONSOLE;

public class TerminalRunner {
  private JsonRpcServer myJsonRpcServer;
  private KillableProcessHandler myProcessHandler;

  public TerminalRunner(JsonRpcServer server) {
    this.myJsonRpcServer = server;
  }

  public void exec(String cwd, String program, List<String> args) {
    this.kill();


    final PtyCommandLine commandLine = (PtyCommandLine) new PtyCommandLine()
      .withWorkDirectory(cwd)
      .withExePath(program)
      .withParameters(args)
      .withParentEnvironmentType(CONSOLE)
      .withCharset(StandardCharsets.UTF_8);

    if (!SystemInfoRt.isWindows) {
      commandLine.getEnvironment().put("TERM", "xterm-256color");
    }
    commandLine.withConsoleMode(false);
    commandLine.withInitialColumns(120);

    try {
      final OSProcessHandler handler = new OSProcessHandler(commandLine);
      handler.startNotify();
      commandLine.createProcess();

      this.myProcessHandler = killableProcess(commandLine);
      initProcessListener(program);

    } catch (ExecutionException e) {
      throw new IllegalStateException("Unable to create process", e);
    }
  }

  public void kill() {

    if (myProcessHandler != null && !myProcessHandler.isProcessTerminated()) {
      ApplicationManager.getApplication().invokeLater(() -> {
        ScriptRunnerUtil.terminateProcessHandler(myProcessHandler, 1000, null);
        myProcessHandler = null;
      });
    }


  }

  private void initProcessListener(String toSkip) {
    this.myProcessHandler.addProcessListener(new ProcessAdapter() {
      @Override
      public void onTextAvailable(@NotNull ProcessEvent event, @NotNull Key outputType) {
        if (!event.getText().contains(toSkip)) {
          myJsonRpcServer.send(NgConsoleServer.DOMAIN, "terminalDataWrite",
            event.getText().replaceAll("(\\r\\n|\\n|\\r)", "\n\r"));
        }

      }

      @Override
      public void processTerminated(@NotNull ProcessEvent event) {
        if (event.getExitCode() == 0) {
          myJsonRpcServer.send(NgConsoleServer.DOMAIN, "terminalDataWrite",
            "\nProcess x completed 🙏\n\r");

        } else {
          myJsonRpcServer.send(NgConsoleServer.DOMAIN, "terminalDataWrite",
            "\nProcess failed 🐳\n\r");
        }

        NgWorkspaceMonitor monitor = ServiceManager.getService(NgWorkspaceMonitor.class);
        monitor.onTerminalCmdFinished();

        myJsonRpcServer.send(NgConsoleServer.DOMAIN, "onExit", event.getExitCode());
        kill();
      }
    });
    this.myProcessHandler.startNotify();
  }


  private SilentKillableProcessHandler killableProcess(final GeneralCommandLine cmd) {
    try {
      return new SilentKillableProcessHandler(cmd);
    } catch (Exception e) {
      throw new IllegalStateException("Unable to create process", e);
    }
  }
}
