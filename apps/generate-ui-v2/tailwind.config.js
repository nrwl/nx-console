/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: 'var(--background-color)',
        foreground: 'var(--foreground-color)',
        primary: 'var(--primary-color)',
        fieldBackground: 'var(--field-background-color)',
        fieldBorder: 'var(--field-border-color)',
        focusBorder: 'var(--focus-border-color)',
        selectFieldBackground: 'var(--select-field-background-color)',
        badgeBackground: 'var(--badge-background-color)',
        bannerWarning: 'var(--banner-warning-color)',
        bannerError: 'var(--banner-error-color)',
        bannerText: 'var(--banner-text-color)',
        separator: 'var(--separator-color)',
        fieldNavHoverBackground: 'var(--field-nav-hover-color)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};
