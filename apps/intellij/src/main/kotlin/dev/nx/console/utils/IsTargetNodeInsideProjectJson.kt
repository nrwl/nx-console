package dev.nx.console.utils

import com.intellij.json.JsonElementTypes
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonProperty
import com.intellij.psi.PsiElement
import com.intellij.psi.impl.source.tree.LeafPsiElement
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.psi.util.parentOfType

fun isTargetNodeInsideProjectJson(element: PsiElement): Boolean {
    if (element !is LeafPsiElement) {
        return false
    }

    if (element.elementType !== JsonElementTypes.DOUBLE_QUOTED_STRING) {
        return false
    }

    if (isInsideNxProjectJsonFile(element).not()) {
        return false
    }

    val property = element.parentOfType<JsonProperty>() ?: return false
    if (isTargetProperty(property).not()) {
        return false
    }
    return true
}

fun isTargetProperty(property: JsonProperty?): Boolean {
    val targetsProperty = PsiTreeUtil.getParentOfType(property, JsonProperty::class.java, true)
    return targetsProperty != null && "targets" == targetsProperty.name
}

fun isInsideNxProjectJsonFile(element: PsiElement): Boolean {
    val file = element.containingFile
    return file is JsonFile && file.name == "project.json"
}
