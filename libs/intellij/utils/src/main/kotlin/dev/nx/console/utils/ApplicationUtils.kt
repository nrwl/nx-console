package dev.nx.console.utils

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Computable

fun <T> computableReadAction(computable: Computable<T>): T {
    return ApplicationManager.getApplication().runReadAction(computable)
}

fun writeAction(runnable: Runnable?) {
    ApplicationManager.getApplication().runWriteAction(runnable!!)
}

fun <T> computableWriteAction(computable: Computable<T>): T {
    return ApplicationManager.getApplication().runWriteAction(computable)
}
