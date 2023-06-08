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
        bannerWarning: 'var(--banner-warning-color)',
        bannerError: 'var(--banner-error-color)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};
