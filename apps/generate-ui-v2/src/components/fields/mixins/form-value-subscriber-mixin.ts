import { ContextConsumer } from '@lit-labs/context';
import { LitElement } from 'lit';
import { formValuesServiceContext } from '../../../form-values.service';

type Constructor<T> = new (...args: any[]) => T;

export declare class FormValueSubscriberInterface {
  getFieldNameForSubscription(): string | undefined;
}

/**
 * Mixin that allows a component to subscribe to form value changes for a specific field
 */
export const FormValueSubscriber = <T extends Constructor<LitElement>>(
  superClass: T,
) => {
  class FormValueSubscriberElement extends superClass {
    // This method should be implemented by subclasses
    getFieldNameForSubscription(): string | undefined {
      return undefined;
    }

    connectedCallback() {
      super.connectedCallback?.();

      const fieldName = this.getFieldNameForSubscription();

      // Only subscribe if we have a field name to identify the field
      if (fieldName) {
        new ContextConsumer(this, {
          context: formValuesServiceContext,
          callback: (service) => {
            if (service) {
              // Register for value changes from the form values service
              service.registerValueChangeListener(fieldName, (newValue) => {
                if (newValue !== undefined) {
                  // Use setFieldValue if available, otherwise update value directly
                  if (typeof (this as any).setFieldValue === 'function') {
                    (this as any).setFieldValue(newValue);
                  } else {
                    (this as any).value = newValue;
                    this.requestUpdate();
                  }
                }
              });
            }
          },
          subscribe: true,
        });
      }
    }
  }

  return FormValueSubscriberElement as unknown as Constructor<FormValueSubscriberInterface> &
    T;
};
