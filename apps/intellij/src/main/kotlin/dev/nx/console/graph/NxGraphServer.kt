import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import dev.nx.console.utils.NxGeneralCommandLine
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import java.io.IOException
import java.net.InetAddress
import java.net.ServerSocket
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

    private var client = HttpClient(CIO)
    private var isStarted = false

    //  val updatedEventEmitter = EventEmitter()

    suspend fun handleWebviewRequest(request: WebviewRequest): WebviewResponse? {
        if (!isStarted) {
            waitForServerReady()
        }

        val url = StringBuilder("http://localhost:${currentPort}/")
        when (request.type) {
            "requestProjectGraph" -> url.append("project-graph.json")
            "requestTaskGraph" -> url.append("task-graph.json")
            "requestExpandedTaskInputs" -> url.append("expanded-task-inputs.json")
            "requestSourceMaps" -> url.append("source-maps.json")
            else -> return null
        }

        return CoroutineScope(Dispatchers.IO).run {
            try {
                val response = client.get(url.toString()).bodyAsText()
                WebviewResponse(request.type, request.id, response)
            } catch (e: Exception) {
                println("Error handling request: $e")
                null
            }
        }
    }

    fun start() {
        if (isStarted) {
            return
        }
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
                val started = spawnProcess(port)
                if (started) {
                    isStarted = true
                }
            } catch (e: Exception) {
                println("error while starting nx graph: $e")
            }
        }
    }

    private suspend fun spawnProcess(port: Int): Boolean {
        println("trying to start graph at $port")

        return try {
            withContext(Dispatchers.IO) {
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

                process.onExit().thenAccept { exitCode ->
                    logger.debug("graph server exited with code $exitCode")
                    isStarted = false
                    nxGraphProcess = null
                    process.errorStream.readAllBytes().decodeToString().run { logger.debug(this) }
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
                true
            }
        } catch (e: Exception) {
            false
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
}
