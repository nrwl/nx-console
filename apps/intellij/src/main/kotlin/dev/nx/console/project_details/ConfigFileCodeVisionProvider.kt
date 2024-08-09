@file:Suppress("UnstableApiUsage")

package dev.nx.console.project_details

import com.intellij.codeInsight.codeVision.*
import com.intellij.codeInsight.codeVision.settings.CodeVisionGroupSettingProvider
import com.intellij.codeInsight.codeVision.ui.model.ClickableTextCodeVisionEntry
import com.intellij.icons.AllIcons
import com.intellij.icons.ExpUiIcons
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonProperty
import com.intellij.lang.ecmascript6.psi.JSExportAssignment
import com.intellij.lang.javascript.psi.JSFile
import com.intellij.lang.javascript.psi.JSStatement
import com.intellij.lang.javascript.psi.ecmal4.JSImportStatement
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.testFramework.utils.vfs.getPsiFile
import dev.nx.console.models.NxProject
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.utils.createSelectTargetPopup
import java.nio.file.Paths
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal class ConfigFileCodeVisionProvider : CodeVisionProvider<Unit> {
    companion object {
        internal const val ID: String = "dev.nx.console.config-file-code-vision"
    }

    override fun computeCodeVision(editor: Editor, uiData: Unit): CodeVisionState {
        val project = editor.project ?: return CodeVisionState.READY_EMPTY

        return ProjectLevelConfigFileCodeVisionManager.getInstance(project).getCodeVision(editor)
    }

    override fun precomputeOnUiThread(editor: Editor): Unit {
        return
    }

    override fun shouldRecomputeForEditor(editor: Editor, uiData: Unit?): Boolean =
        editor.project?.let {
            ProjectLevelConfigFileCodeVisionManager.getInstance(it).shouldRecomputeForEditor(editor)
        }
            ?: true

    override fun getPlaceholderCollector(editor: Editor, psiFile: PsiFile?) =
        editor.project?.let {
            ProjectLevelConfigFileCodeVisionManager.getInstance(it)
                .getPlaceholderCollector(editor, psiFile)
        }

    override val defaultAnchor = CodeVisionAnchorKind.Default
    override val id = ID
    override val groupId = ID
    override val name = "Nx Config Files"
    override val relativeOrderings: List<CodeVisionRelativeOrdering> = emptyList()
}

@Service(Service.Level.PROJECT)
class ProjectLevelConfigFileCodeVisionManager(
    private val project: Project,
    private val cs: CoroutineScope
) {

    private val partialPathToTargetsMap = mutableMapOf<String, List<String>>()
    private var nxWorkspaceCache: NxWorkspace? = null

    init {
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    if (project.isDisposed) {
                        return@NxWorkspaceRefreshListener
                    }
                    partialPathToTargetsMap.clear()
                    nxWorkspaceCache = null
                    cs.launch { refreshCodeVision(project) }
                }
            )
        }
    }

    fun getCodeVision(editor: Editor): CodeVisionState {
        val project = editor.project ?: return CodeVisionState.READY_EMPTY

        val file = editor.virtualFile
        val normalizedFilePath = Paths.get(file.path).normalize().toString()

        val nxProjectForFile =
            ProjectConfigFilesService.getInstance(project).getProjectForFile(file)

        if (file.path.endsWith("project.json") || file.path.endsWith("package.json")) {
            return getCodeVisionForProjectOrPackageJson(
                editor,
                nxProjectForFile,
            )
        }

        if (nxProjectForFile == null) {
            return CodeVisionState.READY_EMPTY
        }

        val codeVisionTextRange =
            ApplicationManager.getApplication().runReadAction<TextRange?> {
                getJsTsCodevisionLocation(editor)
            }

        if (partialPathToTargetsMap[normalizedFilePath] != null) {
            val targets = partialPathToTargetsMap[normalizedFilePath]!!
            val nxProjectName = nxProjectForFile.name

            if (targets.size > 1) {
                return CodeVisionState.Ready(
                    listOf(
                        Pair(
                            codeVisionTextRange ?: TextRange.create(0, 0),
                            ClickableTextCodeVisionEntry(
                                "Run $nxProjectName targets via Nx",
                                providerId = ConfigFileCodeVisionProvider.ID,
                                icon = ExpUiIcons.Run.Run,
                                onClick = { _, _ ->
                                    val popup =
                                        createSelectTargetPopup(
                                            "Select target of $nxProjectName to run",
                                            targets
                                        ) {
                                            NxTaskExecutionManager.getInstance(project)
                                                .execute(nxProjectName, it)
                                        }
                                    popup.showInBestPositionFor(editor)
                                }
                            )
                        )
                    )
                )
            } else if (targets.size == 1) {
                return CodeVisionState.Ready(
                    listOf(
                        Pair(
                            codeVisionTextRange ?: TextRange.create(0, 0),
                            ClickableTextCodeVisionEntry(
                                "Run ${nxProjectName}:${targets[0]} via Nx",
                                providerId = ConfigFileCodeVisionProvider.ID,
                                icon = ExpUiIcons.Run.Run,
                                onClick = { _, _ ->
                                    NxTaskExecutionManager.getInstance(project)
                                        .execute(nxProjectName, targets[0])
                                }
                            )
                        )
                    )
                )
            } else {
                return CodeVisionState.READY_EMPTY
            }
        }

        cs.launch { loadTargetsAndRefresh(normalizedFilePath, nxProjectForFile.name, project) }

        return CodeVisionState.NotReady
    }

    private fun getCodeVisionForProjectOrPackageJson(
        editor: Editor,
        nxProject: NxProject?,
    ): CodeVisionState {
        val codeVisionTextRange =
            ApplicationManager.getApplication().runReadAction<TextRange?> {
                getJsonCodevisionLocation(editor)
            }
        if (nxProject == null) {
            if (nxWorkspaceCache == null) {
                cs.launch { loadWorkspaceAndRefresh(project) }
                return CodeVisionState.NotReady
            }
            if (nxWorkspaceCache?.errors != null) {
                return CodeVisionState.Ready(
                    listOf(
                        Pair(
                            codeVisionTextRange ?: TextRange(0, 0),
                            ClickableTextCodeVisionEntry(
                                "Project Graph Computation Failed. Click to see errors.",
                                providerId = ConfigFileCodeVisionProvider.ID,
                                icon = AllIcons.General.Error,
                                onClick = { _, _ ->
                                    editor.project?.also { project ->
                                        val fileEditorManager =
                                            FileEditorManager.getInstance(project)
                                        val fileEditors = fileEditorManager.allEditors
                                        val textEditorWithPreview =
                                            fileEditors
                                                .asSequence()
                                                .filterIsInstance<ProjectDetailsEditorWithPreview>()
                                                .find { textEditor ->
                                                    textEditor.textEditor.editor == editor
                                                }

                                        textEditorWithPreview?.apply { showWithPreview() }
                                    }
                                }
                            )
                        )
                    )
                )
            } else {
                return CodeVisionState.READY_EMPTY
            }
        }

        if (nxProject.targets.isEmpty()) {
            return CodeVisionState.READY_EMPTY
        }

        var targetsString = "Nx Targets: ${nxProject.targets.keys.joinToString(", ")}"
        if (targetsString.length > 50) {
            targetsString = "${targetsString.slice(IntRange(0, 50 -3))}..."
        }
        return CodeVisionState.Ready(
            listOf(
                Pair(
                    codeVisionTextRange ?: TextRange(0, 0),
                    ClickableTextCodeVisionEntry(
                        targetsString,
                        providerId = ConfigFileCodeVisionProvider.ID,
                        icon = ExpUiIcons.Run.Run,
                        onClick = { _, _ ->
                            val popup =
                                createSelectTargetPopup(
                                    "Select target of ${nxProject.name} to run",
                                    nxProject.targets.keys.toList()
                                ) {
                                    NxTaskExecutionManager.getInstance(project)
                                        .execute(nxProject.name, it)
                                }
                            popup.showInBestPositionFor(editor)
                        }
                    )
                )
            )
        )
    }

    fun shouldRecomputeForEditor(editor: Editor): Boolean = true

    fun getPlaceholderCollector(editor: Editor, psiFile: PsiFile?): CodeVisionPlaceholderCollector {
        return object : GenericPlaceholderCollector {
            override fun collectPlaceholders(editor: Editor): List<TextRange> {
                return listOf(TextRange.create(0, 0))
            }
        }
    }

    private suspend fun loadTargetsAndRefresh(
        path: String,
        nxProjectName: String,
        project: Project
    ) {
        val targets =
            NxlsService.getInstance(project).targetsForConfigFile(nxProjectName, path).keys.toList()

        partialPathToTargetsMap[path] = targets
        refreshCodeVision(project)
    }

    private suspend fun loadWorkspaceAndRefresh(project: Project) {
        nxWorkspaceCache = null
        nxWorkspaceCache = NxlsService.getInstance(project).workspace()
        refreshCodeVision(project)
    }

    private suspend fun refreshCodeVision(project: Project) {
        withContext(Dispatchers.EDT) {
            project
                .getService(CodeVisionHost::class.java)
                .invalidateProvider(
                    CodeVisionHost.LensInvalidateSignal(
                        null,
                        listOf(ConfigFileCodeVisionProvider.ID)
                    )
                )
        }
    }

    private fun getJsonCodevisionLocation(editor: Editor): TextRange? {
        val document = editor.document
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(document) ?: return null

        if (psiFile is JsonFile) {
            val path = editor.virtualFile.path

            if (path.endsWith("project.json")) {
                val targetsProperty =
                    PsiTreeUtil.findChildrenOfType(psiFile, JsonProperty::class.java).firstOrNull {
                        it.name == "targets"
                    }
                return targetsProperty?.textRange
            } else if (path.endsWith("package.json")) {
                val scriptsProperty =
                    PsiTreeUtil.findChildrenOfType(psiFile, JsonProperty::class.java).firstOrNull {
                        it.name == "scripts"
                    }
                return scriptsProperty?.textRange
            }
        }
        return null
    }

    private fun getJsTsCodevisionLocation(editor: Editor): TextRange? {
        val document = editor.document
        val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(document) ?: return null

        if (psiFile is JSFile) {
            PsiTreeUtil.findChildOfType(psiFile, JSExportAssignment::class.java)?.also {
                return it.textRange
            }

            PsiTreeUtil.findChildrenOfType(psiFile, JSStatement::class.java)
                ?.firstOrNull { it !is JSImportStatement }
                ?.also {
                    return it.textRange
                }
        }

        return null
    }

    companion object {
        fun getInstance(project: Project): ProjectLevelConfigFileCodeVisionManager {
            return project.getService(ProjectLevelConfigFileCodeVisionManager::class.java)
        }
    }
}

internal class ConfigFileCodeVisionGroupSettingProvider : CodeVisionGroupSettingProvider {
    override val groupId: String
        get() = ConfigFileCodeVisionProvider.ID

    override val description =
        "The targets available in or defined by a specific Nx config file. Click to run target or select target to run from a list."

    override val groupName = "Nx Config Files"
}
