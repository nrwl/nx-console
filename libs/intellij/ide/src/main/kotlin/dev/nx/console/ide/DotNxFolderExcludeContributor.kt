package dev.nx.console.ide

import com.intellij.javascript.library.exclude.JsExcludeContributor

internal class DotNxFolderExcludeContributor : JsExcludeContributor() {
    override val excludeFileOrDirName: String
        get() = ".nx"

    override val isDirectory: Boolean
        get() = true
}
