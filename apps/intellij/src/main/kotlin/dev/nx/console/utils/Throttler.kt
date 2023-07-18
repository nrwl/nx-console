package dev.nx.console.utils

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class Throttler(private val waitMs: Long, private val scope: CoroutineScope) {
    private var lastExecutionTime = 0L

    fun throttle(func: () -> Unit) {
        val currentTime = System.currentTimeMillis()
        if ((currentTime - lastExecutionTime) >= waitMs) {
            lastExecutionTime = currentTime
            scope.launch { func() }
        }
    }
}
