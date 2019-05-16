package io.nrwl.ide.console;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.ApplicationComponent;
import com.intellij.openapi.components.ServiceManager;
import com.intellij.openapi.util.Disposer;

/**
 * Listens for application lifecycle and make sure that NG AngularConsole node process was really shutdown with
 * the last closed angular project.
 */
@SuppressWarnings({"deprecation"})
public class NgConsoleAppLifecycle implements ApplicationComponent {


  @Override
  public void initComponent() {
    NgWorkspaceMonitor registry = ServiceManager.getService(NgWorkspaceMonitor.class);

    /**
     * Force shutdown NgConsoleServer when all is disposed.
     *
     */
    Disposer.register(ApplicationManager.getApplication(), registry);
  }


}
