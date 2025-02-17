// package dev.nx.console.nxls
//
// import com.intellij.codeInsight.completion.CompletionParameters
// import com.intellij.codeInsight.completion.CompletionResultSet
// import com.intellij.execution.configurations.GeneralCommandLine
// import com.intellij.lsp.LspServerDescriptor
// import com.intellij.lsp.LspServerSupportProvider
// import com.intellij.lsp.data.LspCompletionItem
// import com.intellij.openapi.project.Project
// import com.intellij.openapi.vfs.VirtualFile
//
// private val nxFiles = setOf("nx.json", "workspace.json", "project.json")
//
// class NxlsSupportProvider : LspServerSupportProvider {
//    override fun getServerDescriptor(project: Project, file: VirtualFile): LspServerDescriptor? {
//        return if (file.name in nxFiles) {
//            NxlsServerDescriptor(project, file)
//        } else {
//            null
//        }
//    }
// }
//
// class NxlsServerDescriptor(project: Project, vararg roots: VirtualFile) :
//    LspServerDescriptor(project, *roots) {
//
//    override fun createCommandLine(): GeneralCommandLine {
//        return NxlsProcess(project).createCommandLine()
//    }
//
//    override fun processCompletionItems(
//        parameters: CompletionParameters,
//        result: CompletionResultSet,
//        completionItems: MutableList<LspCompletionItem>
//    ) {
//        super.processCompletionItems(parameters, result, completionItems)
//    }
// }
