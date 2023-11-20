package dev.nx.console.project_details

import com.intellij.lang.Language
import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.project.DumbAware
import dev.nx.console.NxIcons
import javax.swing.Icon

class ProjectDetailsFileType : LanguageFileType(Language.findLanguageByID("JSON")!!), DumbAware {
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
        return NxIcons.FileType // Replace with your custom icon.
    }

    companion object {
        val INSTANCE = ProjectDetailsFileType()
    }
}
