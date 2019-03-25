package io.nrwl.ide.console.server;

import com.intellij.execution.process.ProcessAdapter;
import com.intellij.execution.process.ProcessEvent;
import com.intellij.execution.process.ProcessHandler;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.Key;
import org.jetbrains.annotations.NotNull;

/**
 * Right now used only for logging but in case I need some output processing I might use it more.
 */
public class ProcessOutputLogger {
    private static final Logger LOG = Logger.getInstance(ProcessOutputLogger.class);

    private final ProcessHandler myProcessHandler;

    public ProcessOutputLogger(@NotNull ProcessHandler processHandler) {
        myProcessHandler = processHandler;
    }


    public void startNotify() {
        myProcessHandler.addProcessListener(new ProcessAdapter() {
            @Override
            public void onTextAvailable(@NotNull ProcessEvent event, @NotNull Key outputType) {
                LOG.info("ProcessOutputType : " + event.getText());
            }
        });
        myProcessHandler.startNotify();
    }
}
