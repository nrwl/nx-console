package dev.nx.console.toolWindow

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel

class NxToolWindowPanel(project: Project) : SimpleToolWindowPanel(true, true) {

    private val nx = NxToolWindow(project)

    init {
        toolbar = nx.toolbar.component
        nx.toolbar.targetComponent = this
        setContent(nx.content)
    }
}
