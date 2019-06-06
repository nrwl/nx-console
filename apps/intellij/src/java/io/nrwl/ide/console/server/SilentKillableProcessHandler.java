package io.nrwl.ide.console.server;

import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.KillableProcessHandler;

import java.nio.charset.Charset;

public class SilentKillableProcessHandler extends KillableProcessHandler {
  public SilentKillableProcessHandler(Process process, String commandLine, Charset charset) {
    super(process, commandLine, charset);
  }

  public SilentKillableProcessHandler(GeneralCommandLine commandLine) throws ExecutionException {
    super(commandLine);
  }

  public SilentKillableProcessHandler(Process process, String commandLine) {
    super(process, commandLine);
  }

  public SilentKillableProcessHandler(GeneralCommandLine commandLine, boolean withMediator) throws ExecutionException {
    super(commandLine, withMediator);
  }
}
