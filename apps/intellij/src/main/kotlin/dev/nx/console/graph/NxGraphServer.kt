import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic
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
class StandardNxGraphServer(project: Project) : NxGraphServer(project, 5580, false) {
    companion object {
        fun getInstance(project: Project): NxGraphServer =
            project.getService(StandardNxGraphServer::class.java)
    }
}

@Service(Service.Level.PROJECT)
class AffectedNxGraphServer(project: Project) : NxGraphServer(project, 5590, true) {
    companion object {
        fun getInstance(project: Project): NxGraphServer =
            project.getService(AffectedNxGraphServer::class.java)
    }
}

val logger = logger<NxGraphServer>()

open class NxGraphServer(
    private val project: Project,
    private val startPort: Int,
    private val affected: Boolean
) : Disposable {

    var currentPort: Int? = null
    private var nxGraphProcess: Process? = null

    private val client = HttpClient.newBuilder().build()

    private var isStarted = false
    private var isStarting = false

    init {
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        CoroutineScope(Dispatchers.Default).launch {
                            nxGraphProcess?.apply {
                                if (!isAlive) {
                                    start()
                                }
                            }
                        }
                    }
                }
            )
        }
    }

    suspend fun handleGraphRequest(request: NxGraphRequest): NxGraphRequest {
        if (nxGraphProcess?.isAlive != true) {
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

        val httpRequest = HttpRequest.newBuilder().uri(URI.create(url)).build()

        val response =
            withContext(Dispatchers.IO) {
                client.send(httpRequest, HttpResponse.BodyHandlers.ofString())
            }
        return NxGraphRequest(type = request.type, id = request.id, payload = response.body())
    }

    fun start() {
        if ((isStarted && nxGraphProcess?.isAlive == true) || isStarting) {
            return
        }

        isStarting = true
        isStarted = false
        CoroutineScope(Dispatchers.Default).launch {
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
                listenForGraphUpdates()

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

            while (!stopWaiting && reader.ready()) {
                val line = reader.readLine()?.trim()?.lowercase()

                if (line != null && line.contains(port.toString())) {
                    stopWaiting = true
                }
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

    private fun listenForGraphUpdates() {
        nxGraphProcess?.also {
            CoroutineScope(Dispatchers.IO).launch {
                it.inputStream.bufferedReader().use { reader ->
                    while (isActive && it.isAlive) {
                        val line = reader.readLine()
                        if (line != null && line.contains("updated")) {
                            project.messageBus.syncPublisher(NX_GRAPH_SERVER_REFRESH).onRefresh()
                        }
                    }
                }
            }
        }
    }

    private fun handleGraphProcessError(process: Process) {
        process.onExit().thenAccept { exitCode ->
            logger.debug("graph server exited with code $exitCode")
            isStarted = false
            nxGraphProcess = null
            process.errorStream.readAllBytes().decodeToString().run { logger.debug(this) }
        }
    }

    suspend fun waitForServerReady() {
        while (!isStarted) {
            delay(100)
        }
    }

    override fun dispose() {
        nxGraphProcess?.destroyForcibly()
        nxGraphProcess = null
        isStarted = false
    }

    companion object {
        val NX_GRAPH_SERVER_REFRESH: Topic<NxGraphServerRefreshListener> =
            Topic("NxGraphServerRefresh", NxGraphServerRefreshListener::class.java)
    }
}

interface NxGraphServerRefreshListener {
    fun onRefresh()
}
