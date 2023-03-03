package dev.nx.console.run

import com.intellij.execution.lineMarker.ExecutorAction
import com.intellij.execution.lineMarker.RunLineMarkerContributor
import com.intellij.icons.AllIcons.RunConfigurations
import com.intellij.json.JsonElementTypes
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonProperty
import com.intellij.psi.PsiElement
import com.intellij.psi.impl.source.tree.LeafPsiElement
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.psi.util.parentOfType

class NxRunLineMarkerContributor : RunLineMarkerContributor() {
    override fun getInfo(element: PsiElement): Info? {
        if (element !is LeafPsiElement) {
            return null
        }

        if (element.elementType !== JsonElementTypes.DOUBLE_QUOTED_STRING) {
            return null
        }

        if (isInsideNxProjectJsonFile(element).not()) {
            return null
        }

        val property = element.parentOfType<JsonProperty>() ?: return null
        if (isTargetProperty(property).not()) {
            return null
        }

        return Info(RunConfigurations.TestState.Run, ExecutorAction.getActions()) { "Run Target" }
    }
}

fun isTargetProperty(property: JsonProperty?): Boolean {
    val targetsProperty = PsiTreeUtil.getParentOfType(property, JsonProperty::class.java, true)
    return targetsProperty != null && "targets" == targetsProperty.name
}

fun isInsideNxProjectJsonFile(element: PsiElement): Boolean {
    val file = element.containingFile
    return file is JsonFile && file.name == "project.json"
}
