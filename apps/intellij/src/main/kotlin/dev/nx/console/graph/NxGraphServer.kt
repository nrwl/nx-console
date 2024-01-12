import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic
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

    private var isStarted = false

    //    val updatedEventEmitter =

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
                val process = spawnProcess(port)
                nxGraphProcess = process
                handleGraphProcessError(process)
                listenForGraphUpdates()

                isStarted = true
            } catch (e: Exception) {
                println("error while starting nx graph: $e")
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
