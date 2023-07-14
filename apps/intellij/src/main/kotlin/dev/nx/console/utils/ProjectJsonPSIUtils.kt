package dev.nx.console.utils

import com.intellij.json.JsonElementTypes
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonObject
import com.intellij.json.psi.JsonProperty
import com.intellij.json.psi.JsonStringLiteral
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiRecursiveElementWalkingVisitor
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.psi.util.elementType
import com.intellij.psi.util.parentOfType
import kotlin.contracts.ExperimentalContracts
import kotlin.contracts.contract

data class NxTargetDescriptor(
    val nxProject: String,
    val nxTarget: String,
    val nxTargetConfiguration: String = ""
) {}

// we should only provide gutters for leaf nodes (see LineMarkerProvider comment)
// this gets the entire node containing the target for a leaf node
fun getPropertyNodeFromLeafNode(element: PsiElement): JsonProperty? {
    if (element.elementType != JsonElementTypes.DOUBLE_QUOTED_STRING) return null
    val parent = element.parentOfType<JsonStringLiteral>() ?: return null
    return parent.parentOfType()
}

fun getNxTargetDescriptorFromNode(element: PsiElement, project: Project): NxTargetDescriptor? {
    if (element.isValid.not()) {
        return null
    }

    if (isTargetNodeInsideProjectJson(element)) {
        val psiProjectJsonFile = element.containingFile as JsonFile
        psiProjectJsonFile.virtualFile ?: return null
        val childPropertyLiteral = element.firstChild as? JsonStringLiteral ?: return null
        val nxTarget = childPropertyLiteral.value
        val nxProject =
            NxProjectJsonToProjectMap.getInstance(project)
                .getProjectForProjectJson(element.containingFile)
                ?.name
                ?: (element
                        .parentOfType<JsonObject>()
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

@OptIn(ExperimentalContracts::class)
fun isTargetNodeInsideProjectJson(element: PsiElement): Boolean {
    contract { returns(true) implies (element is JsonProperty) }

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

@OptIn(ExperimentalContracts::class)
fun isTargetConfigurationNodeInsideProjectJson(element: PsiElement): Boolean {
    contract { returns(true) implies (element is JsonProperty) }
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

fun findLineNumberForTargetAndConfiguration(
    psiFile: PsiFile,
    targetName: String?,
    targetConfigurationName: String?
): Int? {
    class TargetAndConfigurationVisitor : PsiRecursiveElementWalkingVisitor() {
        var foundLineNumber: Int? = null

        override fun visitElement(element: PsiElement) {
            if (
                targetConfigurationName != null &&
                    isTargetConfigurationNodeInsideProjectJson(element) &&
                    element.name == targetConfigurationName
            ) {

                foundLineNumber = getLineNumber(element)
                return
            }
            if (
                targetName != null &&
                    isTargetNodeInsideProjectJson(element) &&
                    element.name == targetName
            ) {
                foundLineNumber = getLineNumber(element)
                return
            }
            super.visitElement(element)
        }

        private fun getLineNumber(element: PsiElement): Int {
            val document =
                PsiDocumentManager.getInstance(element.project).getDocument(element.containingFile)
            return document?.getLineNumber(element.textOffset) ?: -1
        }
    }

    val visitor = TargetAndConfigurationVisitor()
    psiFile.accept(visitor)

    return visitor.foundLineNumber
}
