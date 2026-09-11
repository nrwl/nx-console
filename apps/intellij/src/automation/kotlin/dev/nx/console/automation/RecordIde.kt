package dev.nx.console.automation

import com.intellij.driver.client.Driver
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread
import kotlin.io.path.copyTo
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText

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
                        val source =
                            captureIdeWindows(captureName).singleOrNull {
                                it.fileName.toString() == "frame0.png"
                            } ?: error("No main IDE window captured for $captureName")
                        source.copyTo(output.resolve("$frame.png"))
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
