package dev.nx.console.nxls.server.requests

data class NxProjectsByPathsRequest(val paths: Array<String>) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxProjectsByPathsRequest

        return paths.contentEquals(other.paths)
    }

    override fun hashCode(): Int {
        return paths.contentHashCode()
    }
}
