package io.nrwl.ide.console;

import com.intellij.openapi.components.ApplicationComponent;
import io.nrwl.ide.console.server.NgConsoleServer;
import org.jetbrains.annotations.NotNull;

import static io.nrwl.ide.console.NgConsoleUtil.getServer;
import static io.nrwl.ide.console.NgConsoleUtil.setServer;

/**
 * Listens for application lifecycle
 */
@SuppressWarnings({"deprecation"})
public class NgConsoleAppLifecycle implements ApplicationComponent {


  @Override
  public void initComponent() {
    // Init idle default server when application start ups
    setServer(new NgConsoleServer());
  }

  @Override
  public void disposeComponent() {
    // make sure that is no unclosed process

    if (getServer() != null) {
      getServer().shutdown(false);
      setServer(null);
    }
  }

  @NotNull
  @Override
  public String getComponentName() {
    return NgConsoleAppLifecycle.class.getSimpleName();
  }
}
