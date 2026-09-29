package dev.nx.console.nxls

import com.intellij.openapi.project.Project
import com.intellij.util.io.awaitExit
import dev.nx.console.utils.NxConsoleLogger
import dev.nx.console.utils.nxBasePath
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import kotlinx.coroutines.*

private val logger by lazy { NxConsoleLogger.getInstance() }

private const val MAX_BUFFERED_STDERR_CHARS = 64 * 1024

private const val STDERR_CHUNK_CHARS = 4 * 1024

class NxlsProcess(private val project: Project, private val cs: CoroutineScope) {

    private val basePath = project.nxBasePath

    private var process: Process? = null

    private var onExit: (() -> Unit)? = null

    private var exitJob: Job? = null

    private var stderrJob: Job? = null

    private val stderr = StringBuilder()

    suspend fun start() {
        logger.log("Staring the nxls process in workingDir $basePath")
        val workspace = NxlsWorkspaceSnapshot.capture(project, basePath)
        NxlsCommandLineBuilder(workspace).build().apply {
            process = createProcess()
            process?.let {
                if (!it.isAlive) {
                    throw IOException("Unable to start nxls")
                } else {
                    logger.log("nxls started: $it")
                }
                stderrJob = cs.launch(Dispatchers.IO) { drainStderr(it) }
                exitJob =
                    cs.launch {
                        it.awaitExit()
                        // let the drain coroutine consume whatever is still buffered in the pipe
                        withTimeoutOrNull(2000L) { stderrJob?.join() }

                        val output = synchronized(stderr) { stderr.toString() }
                        if (output.isEmpty()) {
                            return@launch
                        }

                        if (project.isDisposed) {
                            return@launch
                        }

                        logger.error("Nxls early exit: $output")
                        onExit?.invoke()
                    }
            }
        }
    }

    /**
     * Reads the process' stderr for as long as it runs.
     *
     * Nothing else consumes this pipe, so leaving it unread lets it fill up: the server then blocks
     * writing to stderr, stops reading its stdin, and every message we send to it blocks in turn.
     */
    private fun drainStderr(process: Process) {
        // Read fixed chunks rather than lines: a server that emits a huge or unterminated line
        // would otherwise be buffered whole before the cap below could apply.
        val chunk = CharArray(STDERR_CHUNK_CHARS)
        try {
            process.errorStream.reader().use { reader ->
                while (true) {
                    val count = reader.read(chunk)
                    if (count < 0) {
                        return
                    }
                    val text = String(chunk, 0, count)
                    logger.debug("nxls stderr: $text")
                    synchronized(stderr) {
                        stderr.append(text)
                        val overflow = stderr.length - MAX_BUFFERED_STDERR_CHARS
                        if (overflow > 0) {
                            stderr.delete(0, overflow)
                        }
                    }
                }
            }
        } catch (e: IOException) {
            logger.debug("nxls stderr stream closed: ${e.message}")
        }
    }

    suspend fun stop() {
        exitJob?.cancel()
        // Cancelling cannot interrupt a blocking read. The drain ends when the process dies below
        // and its stream reaches end of file.
        stderrJob?.cancel()
        logger.log("stopping nxls process")
        val hasExited =
            if (process?.isAlive == false) {
                logger.log("process is not alive")
                true
            } else {
                withTimeoutOrNull(1000L) {
                    logger.log("waiting for process to exit")
                    process?.awaitExit()
                    true
                } ?: false
            }
        logger.log("Process exited: $hasExited")

        if (!hasExited) {
            logger.log("Process did not exit in time, destroying forcibly.")
            process?.destroyForcibly()
        }
    }

    fun getInputStream(): InputStream? {
        return process?.inputStream
    }

    fun getOutputStream(): OutputStream? {
        return process?.outputStream
    }

    fun isAlive(): Boolean? {
        return process?.isAlive()
    }

    fun callOnExit(callback: () -> Unit) {
        this.onExit = callback
    }
}
