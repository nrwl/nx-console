package io.nrwl.ide.console.ui.wizard;

import com.intellij.ide.util.projectWizard.AbstractNewProjectStep.AbstractCallback;
import com.intellij.ide.util.projectWizard.ProjectSettingsStepBase;
import com.intellij.ide.util.projectWizard.WebProjectTemplate;
import com.intellij.lang.javascript.boilerplate.NpmPackageProjectGenerator.Settings;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.platform.DirectoryProjectGenerator;
import com.intellij.ui.components.JBScrollPane;
import io.nrwl.ide.console.ui.NgConsoleUI;

import javax.swing.*;
import java.awt.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;

/**
 * Additional Settings steps that is here to support mainly WebStorm which does not have clasical wizards steps but
 * only one Panel for which we need to change content.
 * <p>
 * Please see NgConsoleProjectGenerator.
 */
public class NgConsoleSettingsStep extends ProjectSettingsStepBase<Settings> {

    private JPanel myMainRootPanel;
    private BorderLayout myRooPanelLayout;
    private JPanel mySettingsPanel;
    private JPanel myTitlePanel;


    public NgConsoleSettingsStep(DirectoryProjectGenerator<Settings> projectGenerator, AbstractCallback callback) {
        super(projectGenerator, callback);

        myTitlePanel = WebProjectTemplate.createTitlePanel();
    }


    @Override
    public JPanel createPanel() {
        myMainRootPanel = super.createPanel();

        myRooPanelLayout = (BorderLayout) myMainRootPanel.getLayout();
        showSettingsStep();

        return myMainRootPanel;
    }

    private void registerCustomStepListener(final boolean isNext) {
        // remove default create listener and replace it with custom one that replaces the screen.
        // this is for "webstorm"
        removeCustomStepListener();

        myCreateButton.addActionListener(al -> {
            if (isNext) {
                showGenerateStep();
            } else {
                showSettingsStep();
            }
        });
    }

    /**
     * We need to modify default behavior, which to remove default Create action listener that generates the projects
     * and replace it with our custom action that on NEXT it switch the panel wiht the WebView (the next wizard screen)
     */
    private void showSettingsStep() {
        myMainRootPanel.add(myTitlePanel, BorderLayout.NORTH);

        if (mySettingsPanel != null) {
            ((JBScrollPane) myRooPanelLayout.getLayoutComponent(BorderLayout.CENTER)).getViewport()
                    .setView(mySettingsPanel);
        }
        myCreateButton.setText("Next");
        registerCustomStepListener(true);

        myMainRootPanel.revalidate();
        myMainRootPanel.repaint();
    }


    /**
     * It takes instance of NgConsoleUI Panel and place into the existing View. It also change the CreateButton text
     * to the "Previous" and register a listener that changes the panel with original settings content
     */
    private void showGenerateStep() {
        JBScrollPane scrollPane = (JBScrollPane) myRooPanelLayout.getLayoutComponent(BorderLayout.CENTER);
        if (mySettingsPanel == null) {
            mySettingsPanel = (JPanel) scrollPane.getViewport().getView();
        }

        myRooPanelLayout.removeLayoutComponent(myTitlePanel);

        NgConsoleUI consoleUI = ServiceManager.getService(NgConsoleUI.class);
        scrollPane.getViewport().setView(consoleUI.getContent());

        myCreateButton.setText("Previous");
        registerCustomStepListener(false);


        myMainRootPanel.setPreferredSize(new Dimension(1024, 1024));
        myMainRootPanel.revalidate();
        myMainRootPanel.repaint();
    }


    private void removeCustomStepListener() {
        Arrays.asList(myCreateButton.getActionListeners()).forEach(al -> myCreateButton.removeActionListener(al));
    }


    @Override
    public boolean checkValid() {
        String text = myLocationField.getTextField().getText().trim();
        if (Files.exists(Paths.get(text))) {
            setErrorText("NgConsole: Path already exists");
            return false;

        }
        return super.checkValid();
    }


}
