/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Amethyst Haze theme colors
        'amethyst': {
          bg: '#252525',           // Main background (oklch 0.145)
          card: '#343434',         // Card/panel background (oklch 0.205)
          border: '#464646',       // Border color (oklch 0.275)
          input: '#535353',        // Input background (oklch 0.325)
          accent: '#5e5e5e',       // Accent elements (oklch 0.371)
          text: '#fafafa',         // Primary text (oklch 0.985)
          'text-muted': '#a1a1a1', // Muted text (oklch 0.7)
          primary: '#ebebeb',      // Primary elements (oklch 0.922)
        },
      },
    },
  },
  plugins: [],
}
