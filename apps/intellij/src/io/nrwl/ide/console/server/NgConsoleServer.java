package io.nrwl.ide.console.server;

import com.intellij.execution.ExecutionException;
import com.intellij.execution.configuration.EnvironmentVariablesData;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.*;
import com.intellij.javascript.nodejs.NodeCommandLineUtil;
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter;
import com.intellij.javascript.nodejs.npm.NpmUtil;
import com.intellij.lang.javascript.buildTools.npm.rc.NpmCommand;
import com.intellij.lang.javascript.service.JSLanguageServiceUtil;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.NotNullLazyValue;
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
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

/**
 * NgConsoleServer represent
 */
public class NgConsoleServer {
    @NonNls
    private static final Logger LOG = Logger.getInstance(NgConsoleServer.class);
    protected static final String DOMAIN = "ngConsoleServer";

    private final KillableProcessHandler myNgConsoleProcessHandler;
    private final ProcessOutputLogger myOutLogger;

    private JsonRpcServer myRpcServer;
    private File myWorkingDir;


    public NgConsoleServer() throws Exception {
        myWorkingDir = JSLanguageServiceUtil.getPluginDirectory(this.getClass(), "ngConsoleCli");
        myRpcServer = RpcBinaryRequestHandler.getRpcServerInstance();

        myNgConsoleProcessHandler = createProcess();
        myOutLogger = new ProcessOutputLogger(myNgConsoleProcessHandler);

        myOutLogger.startNotify();

        LOG.info("Ng Console started successfully: " + myNgConsoleProcessHandler.getCommandLine());


        myNgConsoleProcessHandler.addProcessListener(new ProcessAdapter() {
            @Override
            public void processTerminated(@NotNull ProcessEvent event) {
                LOG.info("Ng Console server terminated with exit code " + event.getExitCode());
            }
        });

        myRpcServer.registerDomain(DOMAIN, NotNullLazyValue.createConstantValue(new RPCHandlerListener(myRpcServer, this)),
                false, null);
    }

    public void shutdown() {
        if (!myNgConsoleProcessHandler.isProcessTerminated()) {
            if (myRpcServer != null) {
                myRpcServer.send(DOMAIN, "shutdown");

                myRpcServer = null;
            }
            ScriptRunnerUtil.terminateProcessHandler(myNgConsoleProcessHandler, 1000, null);
        }
    }

    private KillableProcessHandler createProcess() throws Exception {
        try {
            GeneralCommandLine commandLine = ReadAction.compute(() -> {
                try {

                    if (doInstallRpcClient().getExitCode() != 0) {
                        LOG.error("Problem installing package");
                        throw new IllegalStateException("Unable to install required");
                    }
                    return createCommandLine();
                } catch (ExecutionException e) {
                    throw new IOException("Can not create command line", e);
                }
            });
            return new KillableProcessHandler(commandLine);
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
            LOG.info("Unable to continue. ngConsole-init.js does not exists!");
            throw new IllegalStateException("Unable to continue. ngConsole-init.js does not exists!");
        }
        commandLine.setWorkDirectory(FileUtil.toSystemDependentName(myWorkingDir.getAbsolutePath()));
        commandLine.addParameter(FileUtil.toSystemDependentName(execPath.toFile().getAbsolutePath()));
        commandLine.addParameter(String.valueOf(BuiltInServerManager.getInstance().getPort()));

        return commandLine;
    }

    File getServerDir() {
        return new File(myWorkingDir, "server");
    }

    /**
     * In order to communicate with the external process we are using ij-rpc-client which we are installing on the fly
     * but it might be good idea already bundle with the plugin
     */
    @SuppressWarnings("deprecation")
    private ProcessOutput doInstallRpcClient() throws Exception {
        NodeJsLocalInterpreter interpreter = NgConsoleUtil.getDefaultNodeInterpreter();

        GeneralCommandLine addNpm = NpmUtil.createNpmCommandLine(null, myWorkingDir,
                interpreter, NpmCommand.ADD, Arrays.asList("ij-rpc-client", "express"));

        return new CapturingProcessHandler(addNpm)
                .runProcess((int) TimeUnit.MINUTES.toMillis(5), true);
    }

}
