package dev.nx.console.cli

import com.intellij.ide.util.projectWizard.WebTemplateNewProjectWizard
import com.intellij.ide.util.projectWizard.WizardContext
import com.intellij.ide.wizard.GeneratorNewProjectWizardBuilderAdapter
import com.intellij.lang.javascript.boilerplate.JavaScriptNewTemplatesFactoryBase
import com.intellij.platform.ProjectTemplate

class NxCLIProjectModuleBuilder :
    GeneratorNewProjectWizardBuilderAdapter(
        WebTemplateNewProjectWizard(NxCreateWorkspaceProjectGenerator())
    )

class NxProjectTemplateFactory : JavaScriptNewTemplatesFactoryBase() {
    override fun createTemplates(context: WizardContext?): Array<ProjectTemplate> =
        arrayOf(NxCreateWorkspaceProjectGenerator())
}
