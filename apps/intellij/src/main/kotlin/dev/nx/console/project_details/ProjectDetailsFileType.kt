package dev.nx.console.project_details

import com.intellij.json.JsonFileType
import com.intellij.openapi.project.DumbAware
import dev.nx.console.NxIcons
import javax.swing.Icon

private class ProjectDetailsFileType : JsonFileType(), DumbAware {
    override fun getName(): String {
        return "Project Details"
    }

    override fun getDescription(): String {
        return "Custom file type for project.json and package.json files"
    }

    override fun getDefaultExtension(): String {
        return "json"
    }

    override fun getIcon(): Icon {
        return NxIcons.FileType
    }
}
