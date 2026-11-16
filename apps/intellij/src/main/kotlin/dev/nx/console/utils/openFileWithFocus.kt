package dev.nx.console.utils

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.vfs.VirtualFile

fun FileEditorManager.openFileWithFocus(file: VirtualFile): Array<FileEditor> {
    OpenFileDescriptor(project, file).navigate(true)
    return getEditors(file)
}
