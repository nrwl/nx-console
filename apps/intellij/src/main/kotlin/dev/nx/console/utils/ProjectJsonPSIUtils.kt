package dev.nx.console.utils

import com.intellij.json.JsonElementTypes
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonObject
import com.intellij.json.psi.JsonProperty
import com.intellij.json.psi.JsonStringLiteral
import com.intellij.psi.PsiElement
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.psi.util.elementType
import com.intellij.psi.util.parentOfType

data class NxTargetDescriptor(
    val nxProject: String,
    val nxTarget: String,
    val nxTargetConfiguration: String? = null
) {}

// we should only provide gutters for leaf nodes (see LineMarkerProvider comment)
// this gets the entire node containing the target for a leaf node
fun getPropertyNodeFromLeafNode(element: PsiElement): JsonProperty? {
    if (element.elementType != JsonElementTypes.DOUBLE_QUOTED_STRING) return null
    val parent = element.parentOfType<JsonStringLiteral>() ?: return null
    return parent.parentOfType()
}

fun getNxTargetDescriptorFromNode(element: PsiElement): NxTargetDescriptor? {
    if (element.isValid.not()) {
        return null
    }

    if (isTargetNodeInsideProjectJson(element)) {
        val psiProjectJsonFile = element.containingFile as JsonFile
        psiProjectJsonFile.virtualFile ?: return null
        val childPropertyLiteral = element.firstChild as? JsonStringLiteral ?: return null
        val nxTarget = childPropertyLiteral.value
        val nxProject =
            (element
                    ?.parentOfType<JsonObject>()
                    ?.parentOfType<JsonObject>()
                    ?.findProperty("name")
                    ?.value as? JsonStringLiteral)
                ?.value
                ?: return null

        return NxTargetDescriptor(nxProject, nxTarget)
    }

    if (isTargetConfigurationNodeInsideProjectJson(element)) {
        val childPropertyLiteral = element.firstChild as? JsonStringLiteral ?: return null
        val nxTargetConfiguration = childPropertyLiteral.value
        val targetProperty = element.parent.parent.parent.parent as? JsonProperty ?: return null
        val nxTarget = targetProperty.name

        val nxProject =
            (targetProperty
                    ?.parentOfType<JsonObject>()
                    ?.parentOfType<JsonObject>()
                    ?.findProperty("name")
                    ?.value as? JsonStringLiteral)
                ?.value
                ?: return null

        return NxTargetDescriptor(nxProject, nxTarget, nxTargetConfiguration)
    }

    return null
}

fun isTargetNodeInsideProjectJson(element: PsiElement): Boolean {
    if (element !is JsonProperty) {
        return false
    }

    if (isInsideNxProjectJsonFile(element).not()) {
        return false
    }
    if (isTargetNode(element).not()) {
        return false
    }
    return true
}

fun isTargetConfigurationNodeInsideProjectJson(element: PsiElement): Boolean {
    if (element !is JsonProperty) {
        return false
    }

    if (isInsideNxProjectJsonFile(element).not()) {
        return false
    }

    val possibleConfigurationsProperty = element.parent.parent as? JsonProperty ?: return false

    if (possibleConfigurationsProperty.name != "configurations") {
        return false
    }

    val possibleTargetsProperty =
        possibleConfigurationsProperty.parent.parent.parent.parent as? JsonProperty ?: return false

    if (possibleTargetsProperty.name != "targets") {
        return false
    }

    return true
}

fun isTargetNode(property: JsonProperty?): Boolean {
    val targetsProperty = PsiTreeUtil.getParentOfType(property, JsonProperty::class.java, true)
    return targetsProperty != null && "targets" == targetsProperty.name
}

fun isInsideNxProjectJsonFile(element: PsiElement): Boolean {
    val file = element.containingFile
    return file is JsonFile && file.name == "project.json"
}
