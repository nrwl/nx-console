package dev.nx.console.generate_ui

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.util.text.StringUtil
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.scale.JBUIScale
import com.intellij.util.ui.EmptyIcon
import com.intellij.util.ui.JBScalableIcon
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import dev.nx.console.generate_ui.editor.DefaultNxGenerateUiFile
import dev.nx.console.nxls.server.NxGenerator
import dev.nx.console.nxls.server.NxGeneratorContext
import dev.nx.console.nxls.server.NxGeneratorOption
import dev.nx.console.nxls.server.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import java.awt.Dimension
import javax.swing.JList
import javax.swing.ListSelectionModel.SINGLE_SELECTION
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

private val logger = logger<NxGenerateUiAction>()

class NxGenerateUiAction() : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        runBlocking { launch { selectGenerator(project, path, e) } }
    }

    private suspend fun selectGenerator(project: Project, path: String?, e: AnActionEvent) {
        val nxlsService = project.service<NxlsService>()
        val generators = nxlsService.generators()

        JBPopupFactory.getInstance()
            .createPopupChooserBuilder(generators)
            .setRenderer(
                object : ColoredListCellRenderer<NxGenerator>() {
                    override fun customizeCellRenderer(
                        list: JList<out NxGenerator>,
                        value: NxGenerator,
                        index: Int,
                        selected: Boolean,
                        hasFocus: Boolean
                    ) {
                        if (!selected && index % 2 == 0) {
                            background = UIUtil.getDecoratedRowColor()
                        }
                        icon = JBUIScale.scaleIcon(EmptyIcon.create(5) as JBScalableIcon)
                        append(
                            value.name.split(":").joinToString(" - "),
                            SimpleTextAttributes.REGULAR_ATTRIBUTES,
                            true
                        )
                        append(
                            " " +
                                StringUtil.shortenTextWithEllipsis(
                                    value.data.description,
                                    80 - value.name.length,
                                    0
                                ),
                            SimpleTextAttributes.GRAY_ATTRIBUTES,
                            false
                        )
                    }
                }
            )
            .setTitle("Nx Generate (UI)")
            .setSelectionMode(SINGLE_SELECTION)
            .setRequestFocus(true)
            .setFilterAlwaysVisible(true)
            .setResizable(true)
            .setMovable(true)
            .setNamerForFiltering { it.name }
            .setItemChosenCallback { chosen ->
                if (chosen != null) {
                    openGenerateUi(project, chosen, path)
                }
            }
            .setMinSize(Dimension(JBUI.scale(350), JBUI.scale(300)))
            .setDimensionServiceKey("nx.dev.console.generate")
            .createPopup()
            .showInBestPositionFor(e.dataContext)
    }

    private fun openGenerateUi(project: Project, generator: NxGenerator, contextPath: String?) {
        var generatorOptions: List<NxGeneratorOption> = emptyList()

        runBlocking {
            launch {
                generatorOptions =
                    project
                        .service<NxlsService>()
                        .generatorOptions(
                            NxGeneratorOptionsRequestOptions(
                                generator.data.collection,
                                generator.name,
                                generator.path
                            )
                        )
            }
        }

        val generatorWithOptions = NxGenerator(generator, generatorOptions)

        var generatorContext: NxGeneratorContext? = null
        contextPath?.let {
            runBlocking {
                launch {
                    generatorContext =
                        project
                            .service<NxlsService>()
                            .generatorContextFromPath(generatorWithOptions, contextPath)
                }
            }
        }

        val virtualFile = DefaultNxGenerateUiFile("Generate", project)

        val fileEditorManager = FileEditorManager.getInstance(project)
        if (fileEditorManager.isFileOpen(virtualFile)) {
            fileEditorManager.closeFile(virtualFile)
        }

        fileEditorManager.openFile(virtualFile, true)

        virtualFile.setupGeneratorForm(
            NxGenerator(generator = generatorWithOptions, contextValues = generatorContext)
        )
    }
}
