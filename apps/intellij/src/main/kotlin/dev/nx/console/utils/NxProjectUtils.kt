package dev.nx.console.utils

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import dev.nx.console.services.NxlsService
import javax.swing.JList
import javax.swing.ListSelectionModel
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.runBlocking

fun getNxProjectFromDataContext(project: Project, dataContext: DataContext): String? {
    val path = dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return null

    return runBlocking {
        NxlsService.getInstance(project).generatorContextFromPath(path = path)?.project
    }
}

suspend fun selectNxProject(
    project: Project,
    dataContext: DataContext?,
    preferredProject: String? = null
): String? = suspendCoroutine {
    val projects = runBlocking {
        NxlsService.getInstance(project).workspace()?.workspace?.projects?.keys?.toMutableList()
            ?: mutableListOf()
    }

    if (preferredProject != null) {
        projects.removeIf { it == preferredProject }
        projects.add(0, preferredProject)
    }
    ApplicationManager.getApplication().invokeLater {
        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(projects)
                .setTitle("Select project")
                .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
                .setRequestFocus(true)
                .setFilterAlwaysVisible(true)
                .setResizable(true)
                .setMovable(true)
                .setAutoPackHeightOnFiltering(true)
                .setRenderer(
                    object : ColoredListCellRenderer<String>() {
                        override fun customizeCellRenderer(
                            list: JList<out String>,
                            value: String?,
                            index: Int,
                            selected: Boolean,
                            hasFocus: Boolean
                        ) {
                            if (value == null) return
                            icon = AllIcons.Nodes.Module
                            append(value, SimpleTextAttributes.REGULAR_ATTRIBUTES, true)
                            if (preferredProject != null && preferredProject == value) {
                                append(
                                    "  - currently open",
                                    SimpleTextAttributes.GRAYED_SMALL_ATTRIBUTES,
                                    false
                                )
                                icon = AllIcons.Nodes.Favorite
                            }
                        }
                    }
                )
                .setItemChosenCallback { chosen -> it.resume(chosen) }
                .setDimensionServiceKey("nx.dev.console.select_target")
                .createPopup()

        if (dataContext != null) {
            popup.showInBestPositionFor(dataContext)
        } else {
            popup.showInFocusCenter()
        }
    }
}

suspend fun selectTargetForNxProject(
    project: Project,
    dataContext: DataContext,
    nxProject: String,
): String? = suspendCoroutine {
    val targets = runBlocking {
        NxlsService.getInstance(project)
            .workspace()
            ?.workspace
            ?.projects
            ?.get(nxProject)
            ?.targets
            ?.keys
            ?.toList()
            ?: emptyList()
    }

    ApplicationManager.getApplication().invokeLater {
        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(targets)
                .setTitle("Select target of $nxProject")
                .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
                .setRequestFocus(true)
                .setFilterAlwaysVisible(true)
                .setResizable(true)
                .setMovable(true)
                .setAutoPackHeightOnFiltering(true)
                .setRenderer(
                    object : ColoredListCellRenderer<String>() {
                        override fun customizeCellRenderer(
                            list: JList<out String>,
                            value: String?,
                            index: Int,
                            selected: Boolean,
                            hasFocus: Boolean
                        ) {
                            if (value == null) return
                            icon = AllIcons.General.Gear
                            append(value, SimpleTextAttributes.REGULAR_ATTRIBUTES, true)
                        }
                    }
                )
                .setItemChosenCallback { chosen -> it.resume(chosen) }
                .setDimensionServiceKey("nx.dev.console.select_target")
                .createPopup()

        popup.showInBestPositionFor(dataContext)
    }
}
