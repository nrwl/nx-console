package dev.nx.console.utils

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.NoAccessDuringPsiEvents
import com.intellij.openapi.util.Computable
import com.intellij.openapi.util.Condition
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class ApplicationUtils {

  companion object {
    private var EXECUTOR_SERVICE: ExecutorService? = null


    init {
      // Single threaded executor is used to simulate a behavior of async sequencial execution.
      // All runnables are executed asyncly but they are executed in the order of their submission.
      EXECUTOR_SERVICE = Executors.newSingleThreadExecutor()
      Runtime.getRuntime().addShutdownHook(object : Thread() {
        override fun run() {
          EXECUTOR_SERVICE?.shutdownNow()
        }
      })
    }

    fun invokeLater(runnable: Runnable?) {
      ApplicationManager.getApplication().invokeLater(runnable!!)
    }

    fun pool(runnable: Runnable?) {
      EXECUTOR_SERVICE!!.submit(runnable)
    }

    fun restartPool() {
      EXECUTOR_SERVICE?.shutdown()
      try {
        EXECUTOR_SERVICE?.awaitTermination(100000, TimeUnit.MILLISECONDS)
      } catch (ignored: InterruptedException) {
      }
      EXECUTOR_SERVICE = Executors.newSingleThreadExecutor()
      Runtime.getRuntime().addShutdownHook(object : Thread() {
        override fun run() {
          EXECUTOR_SERVICE?.shutdownNow()
        }
      })
    }

    fun <T> computableReadAction(computable: Computable<T>): T {
      return ApplicationManager.getApplication().runReadAction(computable)
    }

    fun writeAction(runnable: Runnable?) {
      ApplicationManager.getApplication().runWriteAction(runnable!!)
    }

    fun <T> computableWriteAction(computable: Computable<T>): T {
      return ApplicationManager.getApplication().runWriteAction(computable)
    }

    fun invokeAfterPsiEvents(runnable: Runnable) {
      val wrapper = Runnable {
        if (NoAccessDuringPsiEvents.isInsideEventProcessing()) {
          invokeAfterPsiEvents(runnable)
        } else {
          runnable.run()
        }
      }
      ApplicationManager.getApplication().invokeLater(wrapper,
        Condition { value: Void? -> false }
      )
    }
  }

}
