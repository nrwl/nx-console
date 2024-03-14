import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.util.io.readLineAsync
import dev.nx.console.graph.NxGraphRequest
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.NxGeneralCommandLine
import java.io.IOException
import java.net.InetAddress
import java.net.ServerSocket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import kotlinx.coroutines.*

data class WebviewRequest(val type: String, val id: String) {}

data class WebviewResponse(val type: String, val id: String, val payload: String) {}

@Service(Service.Level.PROJECT)
class StandardNxGraphServer(project: Project, cs: CoroutineScope) :
    NxGraphServer(project, 5580, false, cs) {
    companion object {
        fun getInstance(project: Project): NxGraphServer =
            project.getService(StandardNxGraphServer::class.java)
    }
}

@Service(Service.Level.PROJECT)
class AffectedNxGraphServer(project: Project, cs: CoroutineScope) :
    NxGraphServer(project, 5590, true, cs) {
    companion object {
        fun getInstance(project: Project): NxGraphServer =
            project.getService(AffectedNxGraphServer::class.java)
    }
}

val logger = logger<NxGraphServer>()

open class NxGraphServer(
    private val project: Project,
    private val startPort: Int,
    private val affected: Boolean,
    private val cs: CoroutineScope
) : Disposable {

    var currentPort: Int? = null
    private var nxGraphProcess: Process? = null

    private var lastErrror: String? = null

    private var isStarted = false
    private var isStarting = false

    init {
        with(project.messageBus.connect(this)) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    nxGraphProcess?.apply {
                        if (!isAlive) {
                            start()
                        }
                    }
                }
            )
        }
    }

    suspend fun handleGraphRequest(request: NxGraphRequest, attempt: Int = 0): NxGraphRequest {
        try {

            if (nxGraphProcess == null || nxGraphProcess?.isAlive != true && !isStarting) {
                start()
                waitForServerReady()
            }
            if (!isStarted) {
                waitForServerReady()
            }

            var url = "http://localhost:${this.currentPort}/"
            url +=
                when (request.type) {
                    "requestProjectGraph" -> "project-graph.json"
                    "requestTaskGraph" -> "task-graph.json"
                    "requestExpandedTaskInputs" -> "task-inputs.json?taskId=${request.payload}"
                    "requestSourceMaps" -> "source-maps.json"
                    else -> throw Exception("unknown request type ${request.type}")
                }

            val response =
                withContext(Dispatchers.IO) {
                    val client = HttpClient.newBuilder().build()

                    val httpRequest =
                        HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Accept-Encoding", "gzip, deflate")
                            .build()
                    client.send(httpRequest, HttpResponse.BodyHandlers.ofString())
                }
            return NxGraphRequest(type = request.type, id = request.id, payload = response.body())
        } catch (e: Throwable) {
            logger.info("error while handling graph request: $e")
            if (attempt == 0) {
                return handleGraphRequest(request, 1)
            }

            val error =
                if (e is TimeoutCancellationException && lastErrror != null)
                    "error while running nx graph: $lastErrror"
                else e.message
            return NxGraphRequest(
                type = request.type,
                id = request.id,
                payload = request.payload,
                error = error
            )
        }
    }

    fun start() {
        if ((isStarted && nxGraphProcess?.isAlive == true) || isStarting) {
            return
        }

        isStarting = true
        isStarted = false
        cs.launch {
            var port = startPort
            var isPortAvailable = false
            while (!isPortAvailable) {
                isPortAvailable = checkPort(port)
                if (!isPortAvailable) {
                    port++
                }
            }

            currentPort = port
            try {
                val process = spawnProcess(port)
                nxGraphProcess = process
                handleGraphProcessError(process)

                isStarted = true
                isStarting = false
            } catch (e: Exception) {
                println("error while starting nx graph: $e")
                isStarting = false
            }
        }
    }

    private suspend fun spawnProcess(port: Int): Process {
        println("trying to start graph at $port")

        return withContext(Dispatchers.IO) {
            val commandLine =
                NxGeneralCommandLine(
                    project,
                    listOf(
                        "graph",
                        "--port",
                        port.toString(),
                        "--open",
                        "false",
                        "--watch",
                        if (affected) "--affected" else ""
                    ),
                )

            val process = commandLine.createProcess()
            if (!process.isAlive) {
                throw IOException("Unable to start graph at port $port")
            } else {
                logger.info("graph server started: $process")
            }

            // wait for process to start - signified by logging the port
            val reader = process.inputStream.bufferedReader()
            var stopWaiting = false
            var line: String? = null
            line = reader.readLineAsync()
            thisLogger().trace("Read line while starting: $line")
            while (!stopWaiting) {
                if (line != null && line.contains(port.toString())) {
                    stopWaiting = true
                }
                line = reader.readLineAsync()?.trim()?.lowercase()
                thisLogger().trace("Read line while starting: $line")
            }

            process
        }
    }

    private fun checkPort(port: Int): Boolean {
        return try {
            ServerSocket(port, 1, InetAddress.getByName("127.0.0.1")).use {
                return true
            }
        } catch (e: IOException) {
            false
        }
    }

    private fun handleGraphProcessError(process: Process) {
        lastErrror = null
        process.onExit().thenAccept {
            logger.debug("graph server exited with code ${it.exitValue()}")
            isStarted = false
            isStarting = false
            nxGraphProcess = null

            if (it.exitValue() != 0) {
                val stdErr = process.errorStream.readAllBytes().decodeToString()
                val stdOut = process.inputStream.readAllBytes().decodeToString()
                logger.debug(
                    "graph server exited with error. \n stdErr: $stdErr \n stdOut: $stdOut"
                )
                lastErrror =
                    if (stdErr != null && stdErr.length > 0) stdErr
                    else "graph exited unexpectedly. Full logs: $stdOut"
            }
        }
    }

    private suspend fun waitForServerReady() {
        withTimeout(10000) {
            while (!isStarted) {
                delay(100)
            }
        }
    }

    override fun dispose() {
        nxGraphProcess?.destroyForcibly()
        nxGraphProcess = null
        isStarted = false
        isStarting = false
    }
}

interface NxGraphServerRefreshListener {
    fun onRefresh()
}
