package dev.nx.console.ide.project_json_inspection

import com.intellij.psi.PsiFile
import com.intellij.psi.search.scope.packageSet.NamedScope
import com.intellij.psi.search.scope.packageSet.NamedScopesHolder
import com.intellij.psi.search.scope.packageSet.PackageSet
import dev.nx.console.NxIcons

class NxConfigurationFilesScope : NamedScope(SCOPE_ID, NxIcons.FileType, ProjectJsonPackageSet()) {
    class ProjectJsonPackageSet : PackageSet {
        override fun contains(file: PsiFile, holder: NamedScopesHolder): Boolean {
            return file.virtualFile.name == "project.json"
        }

        override fun createCopy(): PackageSet {
            return this
        }

        override fun getText(): String {
            return "file:*project.json"
        }

        override fun getNodePriority(): Int {
            return 2
        }
    }

    companion object {
        const val SCOPE_ID = "Nx Configuration Files"
    }
}
