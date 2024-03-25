package dev.nx.console.utils

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopup
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import dev.nx.console.nxls.NxlsService
import java.util.function.Consumer
import javax.swing.JList
import javax.swing.ListSelectionModel
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

suspend fun selectNxProject(
    project: Project,
    dataContext: DataContext?,
    preferredProject: String? = null
): String? = suspendCoroutine {
    ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
        val projects =
            NxlsService.getInstance(project).workspace()?.workspace?.projects?.keys?.toMutableList()
                ?: mutableListOf()

        if (preferredProject != null) {
            projects.removeIf { it == preferredProject }
            projects.add(0, preferredProject)
        }
        withContext(Dispatchers.EDT) {
            val popup =
                JBPopupFactory.getInstance()
                    .createPopupChooserBuilder(projects)
                    .setTitle("Select Project")
                    .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
                    .setRequestFocus(true)
                    .setFilterAlwaysVisible(true)
                    .setNamerForFiltering { it }
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
}

suspend fun selectTargetForNxProject(
    project: Project,
    dataContext: DataContext,
    nxProject: String,
): String? = suspendCoroutine { continuation ->
    ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
        val targets =
            NxlsService.getInstance(project)
                .workspace()
                ?.workspace
                ?.projects
                ?.get(nxProject)
                ?.targets
                ?.keys
                ?.toList()
                ?: emptyList()

        withContext(Dispatchers.EDT) {
            val popup =
                createSelectTargetPopup("Select target of $nxProject ", targets) {
                    continuation.resume(it)
                }

            popup.showInBestPositionFor(dataContext)
        }
    }
}

fun createSelectTargetPopup(
    title: String,
    targets: List<String>,
    callback: Consumer<String>
): JBPopup {
    return JBPopupFactory.getInstance()
        .createPopupChooserBuilder(targets)
        .setTitle(title)
        .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
        .setRequestFocus(true)
        .setNamerForFiltering { it }
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
        .setItemChosenCallback { chosen -> callback.accept(chosen) }
        .setDimensionServiceKey("nx.dev.console.select_target")
        .createPopup()
}
