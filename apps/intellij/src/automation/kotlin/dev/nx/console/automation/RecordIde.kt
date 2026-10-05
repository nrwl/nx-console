package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import java.awt.image.BufferedImage
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import javax.imageio.ImageIO
import kotlin.concurrent.thread
import kotlin.io.path.copyTo
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.math.abs
import kotlin.math.roundToInt

@Remote("java.awt.Window")
interface RecordedWindow {
    fun getWindows(): Array<RecordedWindow>

    fun isShowing(): Boolean

    fun getX(): Int

    fun getY(): Int

    fun getWidth(): Int

    fun getHeight(): Int
}

private data class WindowBounds(val x: Int, val y: Int, val width: Int, val height: Int)

private fun Driver.showingWindowBounds(): List<WindowBounds> =
    utility<RecordedWindow>()
        .getWindows()
        .filter { runCatching { it.isShowing() }.getOrDefault(false) }
        .map { WindowBounds(it.getX(), it.getY(), it.getWidth(), it.getHeight()) }

/**
 * The capture API saves every IDE window as a separate image without its position. Popups and
 * dialogs are separate windows, so they would be missing from a recording of the main window alone.
 * Each image is matched to a showing window by size and drawn onto the main window image at that
 * window's offset.
 */
private fun composeWindows(captures: List<Path>, windows: List<WindowBounds>, target: Path) {
    val main = captures.single { it.fileName.toString() == "frame0.png" }
    val frame = ImageIO.read(main.toFile())
    val others = captures.filter { it != main }
    if (others.isEmpty()) {
        main.copyTo(target)
        return
    }

    fun matches(image: BufferedImage, window: WindowBounds, scale: Double) =
        abs(window.width * scale - image.width) <= 2 &&
            abs(window.height * scale - image.height) <= 2

    val scale =
        windows
            .filter { it.width > 0 }
            .map { frame.width.toDouble() / it.width }
            .firstOrNull { scale -> windows.any { matches(frame, it, scale) } }
    val frameBounds = scale?.let { s -> windows.firstOrNull { matches(frame, it, s) } }
    if (scale == null || frameBounds == null) {
        main.copyTo(target)
        return
    }

    val composed = BufferedImage(frame.width, frame.height, BufferedImage.TYPE_INT_RGB)
    val graphics = composed.createGraphics()
    graphics.drawImage(frame, 0, 0, null)
    for (capture in others) {
        val image = ImageIO.read(capture.toFile()) ?: continue
        val bounds =
            windows.firstOrNull { it != frameBounds && matches(image, it, scale) } ?: continue
        graphics.drawImage(
            image,
            ((bounds.x - frameBounds.x) * scale).roundToInt(),
            ((bounds.y - frameBounds.y) * scale).roundToInt(),
            null,
        )
    }
    graphics.dispose()
    ImageIO.write(composed, "png", target.toFile())
}

fun Driver.recordIde(label: String, scenario: Driver.() -> Unit) {
    require(label.matches(Regex("[a-zA-Z0-9_-]+")))
    check(
        ProcessBuilder("ffmpeg", "-version")
            .redirectOutput(ProcessBuilder.Redirect.DISCARD)
            .start()
            .waitFor() == 0
    )
    val name = "$label-${System.currentTimeMillis()}"
    val output = automationOutput().resolve(name).createDirectories()
    val frames = mutableListOf<Pair<String, Long>>()
    val running = AtomicBoolean(true)
    val ready = CountDownLatch(1)
    val failure = AtomicReference<Throwable>()
    val recorder =
        thread(name = "ide-recording", isDaemon = true) {
            try {
                withAutomationDriver {
                    while (running.get()) {
                        val frame = "frame-${frames.size.toString().padStart(5, '0')}"
                        val captureName = "$name-$frame"
                        val timestamp = System.nanoTime()
                        val windows =
                            runCatching { showingWindowBounds() }.getOrDefault(emptyList())
                        val captures = captureIdeWindows(captureName)
                        check(captures.any { it.fileName.toString() == "frame0.png" }) {
                            "No main IDE window captured for $captureName"
                        }
                        composeWindows(captures, windows, output.resolve("$frame.png"))
                        frames.add("$frame.png" to timestamp)
                        ready.countDown()
                        Thread.sleep(250)
                    }
                }
            } catch (error: Throwable) {
                failure.set(error)
                ready.countDown()
            }
        }
    var scenarioError: Throwable? = null
    try {
        check(ready.await(30, TimeUnit.SECONDS)) { "IDE recording did not start" }
        failure.get()?.let { throw it }
        scenario()
    } catch (error: Throwable) {
        scenarioError = error
        throw error
    } finally {
        running.set(false)
        val ended = System.nanoTime()
        recorder.join(30_000)
        try {
            output
                .resolve("result.txt")
                .writeText(
                    if (scenarioError == null) "PASS\n"
                    else "FAIL\n${scenarioError.stackTraceToString()}"
                )
            check(!recorder.isAlive) { "IDE recorder did not stop" }
            failure.get()?.let { throw it }
            check(frames.isNotEmpty()) { "IDE recorder produced no frames" }
            output
                .resolve("frames.ffconcat")
                .writeText(
                    buildString {
                        appendLine("ffconcat version 1.0")
                        frames.forEachIndexed { index, (file, started) ->
                            appendLine("file '$file'")
                            val next = frames.getOrNull(index + 1)?.second ?: ended
                            appendLine("duration ${(next - started) / 1_000_000_000.0}")
                        }
                        appendLine("file '${frames.last().first}'")
                    }
                )
            val result =
                ProcessBuilder(
                        "ffmpeg",
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-y",
                        "-f",
                        "concat",
                        "-safe",
                        "1",
                        "-i",
                        "frames.ffconcat",
                        "-vf",
                        "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                        "-r",
                        "12",
                        "-c:v",
                        "libx264",
                        "-threads",
                        "2",
                        "-pix_fmt",
                        "yuv420p",
                        "-movflags",
                        "+faststart",
                        "$label.mp4",
                    )
                    .directory(output.toFile())
                    .inheritIO()
                    .start()
                    .waitFor()
            check(result == 0) { "ffmpeg failed with exit code $result" }
            println("IDE recording: ${output.resolve("$label.mp4")}")
        } catch (error: Throwable) {
            output.resolve("recording-error.txt").writeText(error.stackTraceToString())
            if (scenarioError == null) output.resolve("result.txt").writeText("RECORDING FAILED\n")
            if (scenarioError != null) scenarioError.addSuppressed(error) else throw error
        }
    }
}
