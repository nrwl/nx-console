package dev.nx.console.generate_ui.editor

import com.intellij.diff.util.FileEditorBase
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.*
import dev.nx.console.generate_ui.CustomSchemeHandlerFactory
import org.cef.CefApp
import javax.swing.JComponent

class NxGenerateUiFileEditor(private val project: Project, private val nxGenerateUiFile: NxGenerateUiFile): FileEditorBase() {

  private val mainComponent: JComponent = nxGenerateUiFile.createMainComponent(project)

  override fun getComponent(): JComponent {
    return mainComponent
  }

  override fun getFile(): VirtualFile {
    return nxGenerateUiFile
  }

  override fun getName(): String {
    return "Nx Generate"
  }

  override fun getPreferredFocusedComponent(): JComponent? {
    return null
  }


}
