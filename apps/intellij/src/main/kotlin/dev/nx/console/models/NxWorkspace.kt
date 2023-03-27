package dev.nx.console.models

data class NxWorkspace(
    val validWorkspaceJson: Boolean,
    val workspace: NxWorkspaceConfiguration,
    val daemonEnabled: Boolean?,
    val workspacePath: String,
    val isLerna: Boolean,
    val nxVersion: NxVersion,
    val isEncapsulatedNx: Boolean,
    val workspaceLayout: WorkspaceLayout?,
) {}

data class WorkspaceLayout(val appsDir: String?, val libsDir: String?)

data class NxWorkspaceConfiguration(val projects: Map<String, NxProject>) {}
