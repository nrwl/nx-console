package io.nrwl.ide.console;

import com.intellij.openapi.components.ApplicationComponent;
import org.jetbrains.annotations.NotNull;

/**
 *
 */
@SuppressWarnings({"deprecation"})
public class AngularConsolePlugin implements ApplicationComponent {


  @Override
  public void initComponent() {
  }

  @Override
  public void disposeComponent() {
    // make sure that is no unclosed process

    if (NgConsoleUtil.getServer() != null) {
      NgConsoleUtil.getServer().shutdown(false);
    }
  }

  @NotNull
  @Override
  public String getComponentName() {
    return AngularConsolePlugin.class.getSimpleName();
  }
}
