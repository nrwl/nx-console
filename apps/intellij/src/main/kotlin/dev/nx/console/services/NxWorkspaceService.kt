package dev.nx.console.services

import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic
import dev.nx.console.models.NxWorkspace

class NxWorkspaceService(val project: Project) {

    companion object {
        val NX_WORKSPACE_CHANGED_TOPIC: Topic<NxWorkspaceChangedListener> =
            Topic("NxWorkspaceChanged", NxWorkspaceChangedListener::class.java)
    }
}

interface NxWorkspaceChangedListener {
    fun onNxWorkspaceChanged(nxWorkspace: NxWorkspace)
}
