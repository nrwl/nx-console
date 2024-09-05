package dev.nx.console.project_details.browsers

import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.models.NxVersion
import dev.nx.console.utils.sync_services.NxVersionUtil
import javax.swing.JComponent

class ProjectDetailsBrowserWrapper(private val project: Project, private val file: VirtualFile) :
    Disposable {

    private var newBrowser: NewProjectDetailsBrowser? = null
    private var oldBrowser: OldProjectDetailsBrowser? = null

    fun getComponent(): JComponent {
        val version = NxVersionUtil.getInstance(project).getNxVersionSynchronously()
        if (version != null && version.gte(NxVersion(major = 20, minor = 0, full = "20.0.0"))) {
            return getOrCreateNewBrowser().component
        } else {
            return getOrCreateOldBrowser().component
        }
    }

    private fun getOrCreateOldBrowser(): OldProjectDetailsBrowser {
        return oldBrowser.let {
            if (it == null) {
                val browser = OldProjectDetailsBrowser(project, file)
                oldBrowser = browser
                browser
            } else {
                it
            }
        }
    }

    private fun getOrCreateNewBrowser(): NewProjectDetailsBrowser {
        return newBrowser.let {
            if (it == null) {
                val browser = NewProjectDetailsBrowser(project, file)
                newBrowser = browser
                browser
            } else {
                it
            }
        }
    }

    override fun dispose() {
        newBrowser?.also { Disposer.dispose(it) }
        oldBrowser?.also { Disposer.dispose(it) }
    }
}
