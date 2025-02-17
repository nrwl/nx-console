package dev.nx.console.models

import kotlinx.serialization.*
import kotlinx.serialization.descriptors.*

data class NxWorkspace(
    val validWorkspaceJson: Boolean,
    val projectGraph: NxProjectGraph,
    val daemonEnabled: Boolean?,
    val workspacePath: String,
    val errors: Array<NxError>?,
    val isLerna: Boolean,
    val nxVersion: NxVersion,
    val isEncapsulatedNx: Boolean,
    val isPartial: Boolean?,
    val workspaceLayout: WorkspaceLayout?,
    val cloudStatus: NxCloudStatus?,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxWorkspace

        if (validWorkspaceJson != other.validWorkspaceJson) return false
        if (projectGraph != other.projectGraph) return false
        if (daemonEnabled != other.daemonEnabled) return false
        if (workspacePath != other.workspacePath) return false
        if (errors != null) {
            if (other.errors == null) return false
            if (!errors.contentEquals(other.errors)) return false
        } else if (other.errors != null) return false
        if (isLerna != other.isLerna) return false
        if (nxVersion != other.nxVersion) return false
        if (isEncapsulatedNx != other.isEncapsulatedNx) return false
        if (workspaceLayout != other.workspaceLayout) return false

        return true
    }

    override fun hashCode(): Int {
        var result = validWorkspaceJson.hashCode()
        result = 31 * result + projectGraph.hashCode()
        result = 31 * result + (daemonEnabled?.hashCode() ?: 0)
        result = 31 * result + workspacePath.hashCode()
        result = 31 * result + (errors?.contentHashCode() ?: 0)
        result = 31 * result + isLerna.hashCode()
        result = 31 * result + nxVersion.hashCode()
        result = 31 * result + isEncapsulatedNx.hashCode()
        result = 31 * result + (workspaceLayout?.hashCode() ?: 0)
        return result
    }
}

data class WorkspaceLayout(val appsDir: String?, val libsDir: String?)

data class NxProjectGraph(val nodes: Map<String, NxProjectGraphProjectNode>)

data class NxProjectGraphProjectNode(val name: String, val type: String, val data: NxProject)

@Serializable()
data class NxError(
    val message: String?,
    val name: String?,
    val stack: String?,
    val file: String?,
    val pluginName: String?,
    @Transient() val cause: Any? = null,
) {

    constructor(message: String) : this(message, null, null, null, null, null)
}
