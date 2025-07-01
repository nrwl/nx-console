package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.openapi.fileTypes.FileType
import dev.nx.console.NxIcons
import javax.swing.Icon

class NxCloudFixFileType : FileType {
    override fun getName(): String = "NxCloudFix"
    
    override fun getDescription(): String = "Nx Cloud AI Fix"
    
    override fun getDefaultExtension(): String = ".nxfix"
    
    override fun getIcon(): Icon = NxIcons.FileType
    
    override fun isBinary(): Boolean = true
    
    override fun isReadOnly(): Boolean = true

    companion object {
        val INSTANCE = NxCloudFixFileType()
    }
}