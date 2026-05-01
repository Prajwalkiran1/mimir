/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mimir-blue': '#1e3a8a',
        'mimir-gold': '#D4AF37',
        'mimir-white': '#0f172a',
        'mimir-light': '#F8FAFC',
      },
    },
  },
  plugins: [],
}