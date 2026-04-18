/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DMV Throwers brand palette
        'brand-red': '#C8102E',
        'navy': '#1a1f36',
        'dark-navy': '#0d1021',
        'cream': '#F5F0E8',
        'cherry-pink': '#F9D0D4',
        'muted-rose': '#e8b4b8',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
