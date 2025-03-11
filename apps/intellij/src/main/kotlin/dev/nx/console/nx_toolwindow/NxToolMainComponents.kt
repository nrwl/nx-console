package dev.nx.console.nx_toolwindow

import com.intellij.analysis.problemsView.toolWindow.ProblemsView
import com.intellij.icons.AllIcons
import com.intellij.ide.browsers.BrowserLauncher
import com.intellij.javascript.nodejs.settings.NodeSettingsConfigurable
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.ui.HyperlinkLabel
import com.intellij.ui.JBColor
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import com.intellij.util.ui.JBUI
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.run.actions.NxInitService
import dev.nx.console.settings.NxConsoleSettingsConfigurable
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import java.awt.*
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import java.net.URI
import javax.swing.*
import javax.swing.border.CompoundBorder

class NxToolMainComponents(private val project: Project) {
    fun createNoProjectsComponent(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)

                    add(
                        JLabel(
                                "<html><h3>We couldn't find any projects in this workspace.</h3> Make sure that the proper dependencies are installed locally and refresh the workspace.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        JButton("Refresh Workspace").apply {
                            action =
                                object : AbstractAction("Refresh Workspace") {
                                    override fun actionPerformed(e: ActionEvent?) {
                                        TelemetryService.getInstance(project)
                                            .featureUsed(
                                                TelemetryEvent.MISC_REFRESH_WORKSPACE,
                                                mapOf(
                                                    "source" to TelemetryEventSource.WELCOME_VIEW
                                                ),
                                            )
                                        NxRefreshWorkspaceService.getInstance(project)
                                            .refreshWorkspace()
                                    }
                                }
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        panel {
                            row {
                                text(
                                        " If you're just getting started with Nx, you can <a href='https://nx.dev/plugin-features/use-code-generators'>use generators</a> to quickly scaffold new projects or <a href='https://nx.dev/reference/project-configuration'>add them manually</a>.<br/> If your Nx workspace is not at the root of the opened project, make sure to set the <a href='open-setting'>workspace path setting</a>."
                                    ) {
                                        if (it.description == "open-setting") {
                                            ShowSettingsUtil.getInstance()
                                                .showSettingsDialog(
                                                    project,
                                                    NxConsoleSettingsConfigurable::class.java,
                                                )
                                        } else {
                                            BrowserLauncher.instance.browse(
                                                URI.create(it.description)
                                            )
                                        }
                                    }
                                    .align(Align.CENTER)
                            }
                        }
                    )
                }
            )
        }
    }

    fun createNoNxWorkspacePanel(): JPanel {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
                    isOpaque = false

                    add(
                        JLabel(
                                "<html><h3>No Nx workspace detected.</h3> You can add Nx to this project or manually select the workspace folder to begin.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 20)))

                    add(
                        JLabel("<html>Or manually select your Nx workspace folder:</html>").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 4)))

                    add(
                        JButton("Nx Init").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                            addActionListener { NxInitService.getInstance(project).runNxInit() }
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 20)))

                    add(
                        JLabel("<html>Or manually select your Nx workspace folder:</html>").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 4)))

                    add(
                        JButton("Select Workspace").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                            addActionListener {
                                ShowSettingsUtil.getInstance()
                                    .showSettingsDialog(
                                        project,
                                        NxConsoleSettingsConfigurable::class.java,
                                    )
                            }
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 20)))

                    add(
                        JLabel("<html>If you have set up Nx, try refreshing:</html>").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 4)))

                    add(
                        JButton("Refresh").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                            addActionListener {
                                NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
                            }
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        panel {
                            row {
                                text(
                                        "New to Nx? <a href='https://nx.dev/plugin-features/use-code-generators'>Use generators</a> to scaffold projects or <a href='https://nx.dev/reference/project-configuration'>configure them manually</a>. " +
                                            "If your workspace isn't at the project root, set the <a href='open-setting'>workspace path</a>."
                                    ) {
                                        if (it.description == "open-setting") {
                                            ShowSettingsUtil.getInstance()
                                                .showSettingsDialog(
                                                    project,
                                                    NxConsoleSettingsConfigurable::class.java
                                                )
                                        } else {
                                            BrowserLauncher.instance.browse(
                                                URI.create(it.description)
                                            )
                                        }
                                    }
                                    .align(Align.CENTER)
                            }
                        }
                    )
                }
            )
        }
    }

    fun createErrorComponent(errorCount: Int): JComponent {
        return panel {
            indent {
                row {
                    text(
                        "<h3> Nx caught ${if (errorCount == 1) "an error" else "$errorCount errors"} while computing the project graph.</h3>"
                    )
                }
                row {
                    button("View Errors") { ProblemsView.getToolWindow(project)?.show() }
                        .align(Align.CENTER)
                }
                row {
                    text(
                        "If the problems persist, you can try running <code>nx reset</code> and then <a href='refresh'>refresh the workspace</a><br /> For more information, look for errors in <a href='open-idea-log'>idea.log</a> and refer to the <a href='https://nx.dev/troubleshooting/troubleshoot-nx-install-issues?utm_source=nxconsole'>Nx Troubleshooting Guide </a> and the <a href='https://nx.dev/recipes/nx-console/console-troubleshooting?utm_source=nxconsole'>Nx Console Troubleshooting Guide</a>."
                    ) {
                        when (it.description) {
                            "refresh" -> {
                                NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
                            }
                            "open-idea-log" -> {
                                val action = ActionManager.getInstance().getAction("OpenLog")

                                val dataContext =
                                    SimpleDataContext.getSimpleContext(
                                        CommonDataKeys.PROJECT,
                                        project
                                    )

                                ActionUtil.invokeAction(
                                    action,
                                    dataContext,
                                    NxToolWindowPanel.NX_TOOLBAR_PLACE,
                                    null,
                                    null,
                                )
                            }
                            else -> {
                                BrowserLauncher.instance.browse(URI.create(it.description))
                            }
                        }
                    }
                }
            }
        }
    }

    fun createNoNodeInterpreterComponent(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)

                    add(
                        JLabel(
                                "<html><h3>Node.js interpreter not configured.</h3> Nx Console needs this setting to start the Nx language server and run Nx processes.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        JButton("Configure Node interpreter").apply {
                            action =
                                object : AbstractAction("Configure Node interpreter") {
                                    override fun actionPerformed(e: ActionEvent?) {
                                        ShowSettingsUtil.getInstance()
                                            .showSettingsDialog(
                                                project,
                                                NodeSettingsConfigurable::class.java,
                                            )
                                    }
                                }
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )
                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        panel {
                            row {
                                text(
                                    "Please configure the Node interpreter and then <a href='refresh'>refresh the workspace</a>"
                                ) {
                                    if (it.description == "refresh") {
                                        NxRefreshWorkspaceService.getInstance(project)
                                            .refreshWorkspace()
                                    }
                                }
                            }
                        }
                    )
                }
            )
        }
    }

    fun createSpinnerPanel(): JPanel {
        val spinner =
            JProgressBar().apply {
                isIndeterminate = true // Continuous animation
                border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
                alignmentX = Component.CENTER_ALIGNMENT // Center horizontally
            }

        val loadingLabel =
            JLabel("Loading...").apply {
                alignmentX = Component.CENTER_ALIGNMENT // Center horizontally
            }

        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(Box.createVerticalGlue()) // Push content to the center vertically
            add(spinner)
            add(Box.createRigidArea(Dimension(0, 10))) // Add spacing between spinner and label
            add(loadingLabel)
            add(Box.createVerticalGlue()) // Push content to the center vertically
        }
    }

    fun createConnectedToNxCloudPanel(nxCloudUrl: String): JPanel {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.X_AXIS)
            border =
                CompoundBorder(
                    JBUI.Borders.empty(0, 10),
                    BorderFactory.createMatteBorder(
                        1,
                        0,
                        0,
                        0,
                        JBColor.border(),
                    ),
                )

            add(JLabel().apply { icon = AllIcons.RunConfigurations.TestPassed })
            add(Box.Filler(Dimension(5, 0), Dimension(5, 0), Dimension(5, 0)))
            add(
                JLabel("Connected to Nx Cloud").apply {
                    font = Font(font.name, Font.BOLD, font.size)
                    alignmentX = Component.LEFT_ALIGNMENT
                }
            )
            add(Box.createHorizontalGlue())
            add(
                JButton().apply {
                    icon = AllIcons.ToolbarDecorator.Export
                    toolTipText = "Open Nx Cloud"

                    isContentAreaFilled = false
                    isBorderPainted = false
                    isFocusPainted = false
                    cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                    addActionListener {
                        TelemetryService.getInstance(project)
                            .featureUsed(TelemetryEvent.CLOUD_OPEN_APP)
                        BrowserLauncher.instance.browse(URI.create(nxCloudUrl))
                    }
                }
            )
        }
    }

    fun createConnectToNxCloudPanel(nxConnectActionListener: ActionListener): JPanel {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border =
                CompoundBorder(
                    BorderFactory.createMatteBorder(1, 0, 0, 0, JBColor.border()),
                    JBUI.Borders.empty(5, 10, 0, 10),
                )

            add(
                JLabel("You're not connected to Nx Cloud.").apply {
                    alignmentX = Component.CENTER_ALIGNMENT
                    font = Font(font.name, Font.BOLD, font.size)
                }
            )

            add(Box.createVerticalStrut(5))

            add(
                JPanel().apply {
                    maximumSize = Dimension(Short.MAX_VALUE.toInt(), 100)
                    layout = FlowLayout(FlowLayout.CENTER, 5, 5)
                    add(
                        JButton("Connect to Nx Cloud").apply {
                            addActionListener(nxConnectActionListener)
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(
                        HyperlinkLabel("Learn more about Nx Cloud").apply {
                            icon = null
                            maximumSize = preferredSize
                            setHyperlinkTarget("https://nx.app?utm_source=nxconsole")
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )
                }
            )
        }
    }
}
