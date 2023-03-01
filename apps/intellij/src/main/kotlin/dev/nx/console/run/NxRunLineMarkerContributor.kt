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

class NxRunLineMarkerContributor : RunLineMarkerContributor() {
    override fun getInfo(element: PsiElement): Info? {
        if (element !is LeafPsiElement) {
            return null
        } else if (element.elementType !== JsonElementTypes.DOUBLE_QUOTED_STRING) {
            return null
        } else {
            val property = findContainingProperty(element)
            if (property != null && property.nameElement === element.getParent()) {
                return if (isTargetProperty(property).not()) null
                else {
                    Info(RunConfigurations.TestState.Run, ExecutorAction.getActions()) {
                        psiElement: PsiElement? ->
                        "Run Target"
                    }
                }
            } else {
                return null
            }
        }
    }
}

fun isTargetProperty(property: JsonProperty?): Boolean {
    val targetsProperty = PsiTreeUtil.getParentOfType(property, JsonProperty::class.java, true)
    return targetsProperty != null && "targets" == targetsProperty.name
}

fun findContainingProperty(element: PsiElement): JsonProperty? {
    return if (isInsideNxProjectJsonFile(element))
        PsiTreeUtil.getParentOfType(element, JsonProperty::class.java, false)
    else null
}

fun isInsideNxProjectJsonFile(element: PsiElement): Boolean {
    val file = element.containingFile
    return file is JsonFile && file.name == "project.json"
}
