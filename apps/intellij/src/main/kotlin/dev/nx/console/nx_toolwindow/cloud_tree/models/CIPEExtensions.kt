package dev.nx.console.nx_toolwindow.cloud_tree.models

import dev.nx.console.models.CIPEInfo
import dev.nx.console.models.CIPERun
import dev.nx.console.models.CIPERunGroup

fun CIPEInfo.getDurationString(): String? {
    return completedAt?.let { end ->
        val durationMs = end - createdAt
        formatDuration(durationMs)
    }
}

fun CIPEInfo.getTimeAgoString(): String {
    val now = System.currentTimeMillis()
    val elapsed = now - createdAt
    return formatTimeAgo(elapsed)
}

private fun formatDuration(durationMs: Long): String {
    val seconds = durationMs / 1000
    val minutes = seconds / 60
    val hours = minutes / 60

    return when {
        hours > 0 -> "${hours}h ${minutes % 60}m"
        minutes > 0 -> "${minutes}m ${seconds % 60}s"
        else -> "${seconds}s"
    }
}

private fun formatTimeAgo(elapsedMs: Long): String {
    val seconds = elapsedMs / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        days > 0 -> "${days}d ago"
        hours > 0 -> "${hours}h ago"
        minutes > 0 -> "${minutes}m ago"
        else -> "just now"
    }
}
