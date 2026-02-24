package dev.nx.console.angular

import com.intellij.lang.ecmascript6.psi.JSExportAssignment
import com.intellij.lang.javascript.psi.JSArrayLiteralExpression
import com.intellij.lang.javascript.psi.JSCallExpression
import com.intellij.lang.javascript.psi.JSFile
import com.intellij.lang.javascript.psi.JSLiteralExpression
import com.intellij.lang.javascript.psi.JSObjectLiteralExpression
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.ProjectLocator
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.PsiManager
import com.intellij.psi.util.PsiTreeUtil
import dev.nx.console.utils.computableReadAction

private val LOG = Logger.getInstance("dev.nx.console.angular.RspackConfigParser")

fun findRspackConfigFile(projectJsonFile: VirtualFile): VirtualFile? {
    val dir = projectJsonFile.parent ?: return null
    return dir.findChild("rspack.config.ts") ?: dir.findChild("rspack.config.js")
}

fun parseRspackIncludePaths(rspackConfigFile: VirtualFile): List<String> {
    return computableReadAction {
        val project =
            ProjectLocator.getInstance().guessProjectForFile(rspackConfigFile)
                ?: run {
                    LOG.debug("no project for ${rspackConfigFile.path}")
                    return@computableReadAction emptyList()
                }

        val psiFile =
            PsiManager.getInstance(project).findFile(rspackConfigFile) as? JSFile
                ?: run {
                    LOG.debug("not a JSFile for ${rspackConfigFile.path}")
                    return@computableReadAction emptyList()
                }

        val createConfigCall =
            findCreateConfigCall(psiFile) ?: return@computableReadAction emptyList()

        val args = createConfigCall.arguments
        if (args.isEmpty()) return@computableReadAction emptyList()

        val firstArg =
            args[0] as? JSObjectLiteralExpression ?: return@computableReadAction emptyList()

        val optionsObj =
            firstArg.findProperty("options")?.value as? JSObjectLiteralExpression
                ?: return@computableReadAction emptyList()

        val stylePreprocessorOptionsObj =
            optionsObj.findProperty("stylePreprocessorOptions")?.value as? JSObjectLiteralExpression
                ?: return@computableReadAction emptyList()

        val includePathsArray =
            stylePreprocessorOptionsObj.findProperty("includePaths")?.value
                as? JSArrayLiteralExpression ?: return@computableReadAction emptyList()

        val paths =
            includePathsArray.expressions.filterIsInstance<JSLiteralExpression>().mapNotNull {
                it.stringValue
            }
        paths
    }
}

/**
 * Finds the `createConfig(...)` call expression in the file. Tries the direct export default path
 * first (simple case), then falls back to a file-wide search to support webpack-merge patterns
 * where `createConfig` is assigned to a variable before being passed to `merge(...)`.
 */
private fun findCreateConfigCall(psiFile: JSFile): JSCallExpression? {
    // Primary: export default createConfig(...)
    val exportAssignment = PsiTreeUtil.findChildOfType(psiFile, JSExportAssignment::class.java)
    val directCall = exportAssignment?.expression as? JSCallExpression
    if (directCall?.methodExpression?.text == "createConfig") {
        return directCall
    }

    // Fallback: const config = createConfig(...); export default async () => merge(config, ...)
    val allCalls = PsiTreeUtil.findChildrenOfType(psiFile, JSCallExpression::class.java)
    return allCalls.firstOrNull { it.methodExpression?.text == "createConfig" }
}
