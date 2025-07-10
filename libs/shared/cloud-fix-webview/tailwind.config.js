/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'libs/shared/cloud-fix-webview/src/**/*.{html,js,ts}',
    'libs/shared/ui-components/src/**/*.{html,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background-color)',
        foreground: 'var(--foreground-color)',
        mutedForeground: 'var(--muted-foreground-color)',
        primary: 'var(--primary-color)',
        error: 'var(--error-color)',
        fieldBackground: 'var(--field-background-color)',
        fieldBorder: 'var(--field-border-color)',
        focusBorder: 'var(--focus-border-color)',
        selectFieldBackground: 'var(--select-field-background-color)',
        activeSelectionBackground: 'var(--active-selection-background-color)',
        badgeBackground: 'var(--badge-background-color)',
        badgeForeground: 'var(--badge-foreground-color)',
        bannerWarning: 'var(--banner-warning-color)',
        bannerError: 'var(--banner-error-color)',
        bannerText: 'var(--banner-text-color)',
        separator: 'var(--separator-color)',
        fieldNavHoverBackground: 'var(--field-nav-hover-color)',
        scrollbarThumb: 'var(--scrollbar-thumb-color)',
        // Cloud-fix specific colors
        success: 'var(--success-color)',
        warning: 'var(--warning-color)',
        hover: 'var(--hover-color)',
        border: 'var(--border-color)',
        secondary: 'var(--secondary-color)',
        secondaryForeground: 'var(--secondary-foreground-color)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};
