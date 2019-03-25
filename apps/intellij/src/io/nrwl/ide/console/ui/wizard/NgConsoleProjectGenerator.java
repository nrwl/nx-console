package io.nrwl.ide.console.ui.wizard;

import com.intellij.ide.util.projectWizard.AbstractNewProjectStep.AbstractCallback;
import com.intellij.ide.util.projectWizard.CustomStepProjectGenerator;
import com.intellij.ide.util.projectWizard.ModuleBuilder;
import com.intellij.ide.util.projectWizard.WebProjectTemplate;
import com.intellij.lang.javascript.boilerplate.NpmPackageGeneratorPeerExtensible;
import com.intellij.lang.javascript.boilerplate.NpmPackageProjectGenerator;
import com.intellij.lang.javascript.boilerplate.NpmPackageProjectGenerator.Settings;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.module.Module;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.ValidationInfo;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.impl.welcomeScreen.AbstractActionWithPanel;
import com.intellij.platform.DirectoryProjectGenerator;
import icons.NgIcons;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.Arrays;


/**
 * Main entry point to the NgConsole Wizard where it creates a custom builder to setup
 * custom environment and  provides necessary Sidebar menu item label.
 */
@SuppressWarnings("deprecation")
public class NgConsoleProjectGenerator extends WebProjectTemplate<Settings>
        implements CustomStepProjectGenerator<Settings> {

    @NonNls
    private static final Logger LOG = Logger.getInstance(NgConsoleProjectGenerator.class);

    @Nls
    @NotNull
    @Override
    public String getName() {
        return "Angular Console";
    }

    @Override
    public Icon getIcon() {
        return NgIcons.NEW_PROJECT;
    }


    @Override
    public String getDescription() {
        return "Create Angular Project using nrwl.io Angular Console";
    }


    /**
     * This additional steps is here to support WebStorm, where we provide Custom settings steps where we can modify
     * the default behavior, which it only shows one Panel with Create button.
     */
    @Override
    public AbstractActionWithPanel createStep(DirectoryProjectGenerator<Settings> projectGenerator,
                                              AbstractCallback<Settings> callback) {
        return new NgConsoleSettingsStep(projectGenerator, callback);
    }


    @NotNull
    @Override
    public ModuleBuilder createModuleBuilder() {
        return new NgConsoleCreateProjectModuleBuilder(this);
    }

    @Override
    public void generateProject(@NotNull Project project, @NotNull VirtualFile baseDir,
                                @NotNull Settings settings, @NotNull Module module) {

    }


    @NotNull
    @Override
    @SuppressWarnings("deprecation")
    public GeneratorPeer<NpmPackageProjectGenerator.Settings> createPeer() {
        return new NgConsoleGeneratorSettingsPeer();
    }


    private static class NgConsoleGeneratorSettingsPeer extends NpmPackageGeneratorPeerExtensible {

        public NgConsoleGeneratorSettingsPeer() {
            super(Arrays.asList("@angular/cli"), "@angular/cli", s -> null);
        }


        @Nullable
        @Override
        public ValidationInfo validate() {
            ValidationInfo validate = super.validate();

            System.out.println("validate = " + validate);

            return validate;
        }

    }
}
