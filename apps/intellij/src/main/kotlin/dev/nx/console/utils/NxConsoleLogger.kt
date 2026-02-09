package dev.nx.console.utils

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import dev.nx.console.settings.NxConsoleSettingsProvider
import java.io.File
import java.io.RandomAccessFile
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.CopyOnWriteArrayList

private val ideaLogger = logger<NxConsoleLogger>()

@Service(Service.Level.APP)
class NxConsoleLogger {

    companion object {
        private const val LOG_FILE_NAME = "nx-console.log"
        private const val MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024L // 5MB
        private const val TRUNCATE_TO_SIZE_BYTES = 3 * 1024 * 1024L // Truncate to 3MB when rotating

        fun getInstance(): NxConsoleLogger =
            ApplicationManager.getApplication().getService(NxConsoleLogger::class.java)
    }

    private val logFile: File = File(PathManager.getLogPath(), LOG_FILE_NAME)
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
    private val listeners = CopyOnWriteArrayList<NxConsoleLogListener>()

    init {
        if (!logFile.exists()) {
            logFile.parentFile?.mkdirs()
            logFile.createNewFile()
        }
    }

    fun log(message: String) {
        ideaLogger.info(message)
        writeToFile("L", message)
        notifyListeners()
    }

    fun debug(message: String) {
        ideaLogger.debug(message)
        if (NxConsoleSettingsProvider.getInstance().enableDebugLogging) {
            writeToFile("D", message)
            notifyListeners()
        }
    }

    fun error(message: String, exception: Throwable? = null) {
        ideaLogger.error(message, exception)
        val fullMessage =
            if (exception != null) {
                "$message\n${exception.stackTraceToString()}"
            } else {
                message
            }
        writeToFile("E", fullMessage)
        notifyListeners()
    }

    fun getLogFilePath(): String = logFile.absolutePath

    @Synchronized
    fun readLogContent(): String {
        return if (logFile.exists()) {
            logFile.readText()
        } else {
            ""
        }
    }

    @Synchronized
    fun clearLogs() {
        try {
            logFile.writeText("")
            notifyListeners()
        } catch (e: Exception) {
            ideaLogger.warn("Failed to clear nx-console.log", e)
        }
    }

    fun logSessionStart() {
        val separator = "=".repeat(60)
        val timestamp = LocalDateTime.now().format(dateFormatter)
        val header =
            """
            |
            |$separator
            |  Nx Console Session Started - $timestamp
            |$separator
            |
            """
                .trimMargin()
        try {
            logFile.appendText(header)
            notifyListeners()
        } catch (e: Exception) {
            ideaLogger.warn("Failed to write session start to nx-console.log", e)
        }
    }

    fun addListener(listener: NxConsoleLogListener) {
        listeners.add(listener)
    }

    fun removeListener(listener: NxConsoleLogListener) {
        listeners.remove(listener)
    }

    @Synchronized
    private fun writeToFile(level: String, message: String) {
        try {
            rotateIfNeeded()

            val timestamp = LocalDateTime.now().format(dateFormatter)
            val logLine = "[$level][$timestamp] $message\n"

            logFile.appendText(logLine)
        } catch (e: Exception) {
            ideaLogger.warn("Failed to write to nx-console.log", e)
        }
    }

    private fun rotateIfNeeded() {
        if (!logFile.exists() || logFile.length() < MAX_FILE_SIZE_BYTES) {
            return
        }

        try {
            RandomAccessFile(logFile, "rw").use { raf ->
                val newStartPosition = logFile.length() - TRUNCATE_TO_SIZE_BYTES
                raf.seek(newStartPosition)

                // Find the next newline to start from a complete line
                while (raf.filePointer < raf.length()) {
                    val b = raf.read()
                    if (b == '\n'.code) {
                        break
                    }
                }

                val remainingContent = ByteArray((raf.length() - raf.filePointer).toInt())
                raf.readFully(remainingContent)

                raf.seek(0)
                raf.setLength(0)
                raf.write("[Log rotated - older entries removed]\n".toByteArray())
                raf.write(remainingContent)
            }
        } catch (e: Exception) {
            ideaLogger.warn("Failed to rotate nx-console.log", e)
        }
    }

    private fun notifyListeners() {
        listeners.forEach { listener ->
            try {
                listener.onLogUpdated()
            } catch (e: Exception) {
                ideaLogger.warn("Error notifying log listener", e)
            }
        }
    }
}

fun interface NxConsoleLogListener {
    fun onLogUpdated()
}
