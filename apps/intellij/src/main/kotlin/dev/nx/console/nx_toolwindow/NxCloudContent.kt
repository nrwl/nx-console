package dev.nx.console.nx_toolwindow

import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBPanel
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import dev.nx.console.models.NxCloudStatus
import dev.nx.console.nx_toolwindow.NxToolWindowPanel.Companion.NX_TOOLBAR_PLACE
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.actions.NxConnectAction
import dev.nx.console.telemetry.TelemetryService
import java.awt.event.ComponentAdapter
import java.awt.event.ComponentEvent
import javax.swing.JComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val nxCloudLearnMoreText =
    "To learn more about Nx Cloud, check out <a href='https://nx.dev/ci/intro/why-nx-cloud?utm_source=nxconsole'> Why Nx Cloud?</a> or get an overview of <a href='https://nx.dev/ci/features?utm_source=nxconsole'> Nx Cloud features </a>. "

class NxCloudPanel(private val project: Project) : JBPanel<NxCloudPanel>() {
    val cs = NxCloudPanelCoroutineHolder.getInstance(project).cs

    init {
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { cs.launch { getCloudStatusAndRenderContent() } }
            )
        }
        cs.launch { getCloudStatusAndRenderContent() }
    }

    private suspend fun getCloudStatusAndRenderContent() {
        val cloudStatus = NxlsService.getInstance(project).cloudStatus()
        withContext(Dispatchers.EDT) {
            removeAll()
            add(
                if (cloudStatus != null && cloudStatus.isConnected) {
                    getConnectedContent(cloudStatus)
                } else {
                    getNotConnectedContent()
                }
            )
            revalidate()
            repaint()
        }
    }

    private fun getConnectedContent(cloudStatus: NxCloudStatus): JComponent {
        return panel {
            indent {
                row { text("<h3>You're connected to Nx Cloud.</h3> ") }
                if (cloudStatus.nxCloudUrl != null) {
                    row {
                        button(
                                "View Nx Cloud App",
                                object : AnAction() {
                                    override fun actionPerformed(e: AnActionEvent) {
                                        val urlWithTracking =
                                            "${cloudStatus.nxCloudUrl}?utm_campaign=open-cloud-app&utm_medium=cloud-promo&utm_source=nxconsole"
                                        TelemetryService.getInstance(project)
                                            .featureUsed("nx.openCloudApp")
                                        BrowserUtil.open(urlWithTracking)
                                    }
                                },
                                NX_TOOLBAR_PLACE
                            )
                            .align(Align.CENTER)
                    }
                }
                row { text(nxCloudLearnMoreText) }
            }
        }
    }

    private fun getNotConnectedContent(): JComponent {
        return panel {
            indent {
                row { text("<h3>You're not connected to Nx Cloud.</h3> ") }
                row { button("Connect to Nx Cloud", NxConnectAction()).align(Align.CENTER) }
                row { text(nxCloudLearnMoreText) }
            }
        }
    }

    override fun addNotify() {
        super.addNotify()
        addComponentListener(resizeListener)
    }

    override fun removeNotify() {
        super.removeNotify()
        removeComponentListener(resizeListener)
    }

    private val resizeListener =
        object : ComponentAdapter() {
            override fun componentResized(e: ComponentEvent?) {
                revalidate()
                repaint()
            }
        }
}

@Service(Service.Level.PROJECT)
private class NxCloudPanelCoroutineHolder(val project: Project, val cs: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): NxCloudPanelCoroutineHolder {
            return project.getService(NxCloudPanelCoroutineHolder::class.java)
        }
    }
}
