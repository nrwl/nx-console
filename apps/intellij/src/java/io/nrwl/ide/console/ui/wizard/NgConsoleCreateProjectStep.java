package io.nrwl.ide.console.ui.wizard;

import com.intellij.ide.util.projectWizard.ModuleWizardStep;
import com.intellij.ide.wizard.AbstractWizard;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.diagnostic.Logger;
import io.nrwl.ide.console.ui.NgConsoleUI;
import io.nrwl.ide.console.NgConsoleUtil;
import org.jetbrains.annotations.NonNls;

import javax.swing.*;
import java.awt.*;

/**
 * Final step of the wizard  (Mainly used by IDEA) that renders a web content. Default behavior is always to show
 * Next/Finish button in the last step which in this case is little bit confusing when Angular Console client has its
 * own Create button.
 * <p>
 * Therefore the plan is to rely on the NGConsole Create button which generates the directory structure and then
 * programmatically invoke the wizard's Finish button that open up just created project.
 */
public class NgConsoleCreateProjectStep extends ModuleWizardStep {
    @NonNls
    private static final Logger LOG = Logger.getInstance(NgConsoleCreateProjectModuleBuilder.class);

    private AbstractWizard myWizard;
    private NgConsoleCreateProjectModuleBuilder myModuleBuilder;
    private JPanel myMainPanel;

    public NgConsoleCreateProjectStep(AbstractWizard w, NgConsoleCreateProjectModuleBuilder mb) {
        myMainPanel = new JPanel(new BorderLayout());
        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);

        LOG.info("NgConsoleCreateProjectStep:...... ");

        // just a test so we can programmatically create project out of the path and open it.
        JButton finishButton = new JButton("CLICK ME TO FINISH");
        finishButton.addActionListener(e -> {
            JButton nextButton = NgConsoleUtil.getNextButton(myWizard);
            nextButton.doClick();

//            myWizard.close(DialogWrapper.OK_EXIT_CODE);
        });

        myMainPanel.add(finishButton, BorderLayout.NORTH);
        myMainPanel.add(consoleUI.getContent(), BorderLayout.CENTER);
        myMainPanel.setBorder(null);

        myWizard = w;
        myModuleBuilder = mb;
    }


    @Override
    public void updateDataModel() {
        System.out.println("myWizard = " + myWizard);
        LOG.info("NgConsoleCreateProjectStep:...... ");

    }


    @Override
    public void _init() {
        super._init();

        LOG.info("_init:...... ");
        // We need to use this little hack to hide the finish button
        JButton nextButton = NgConsoleUtil.getNextButton(myWizard);
        if (nextButton != null) {
            nextButton.setVisible(false);
        }

        String projectName = myModuleBuilder.getName();
        String projectPath = myModuleBuilder.getModuleFileDirectory();


        // Refresh the URL
        ServiceManager.getService(NgConsoleUI.class)
                .goToUrl("https://www.google.com/search?q=Angular+Console+" + projectName);
    }


    @Override
    public JComponent getComponent() {
        return myMainPanel;
    }

    @Override
    public JComponent getPreferredFocusedComponent() {
        return myMainPanel;
    }
}
