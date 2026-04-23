/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DMV Throwers brand palette — matches dmvthrowers.club
        'brand-red': '#D42B2B',
        'brand-red-dark': '#b01f1f',
        'navy': '#1a2744',
        'navy-deep': '#0e1833',
        'dark-navy': '#0e1833',
        'cream': '#f5f0e8',
        'cream-mid': '#f0ebe0',
        'hairline': '#d4cebc',
        'text-body': '#3a4a6a',
        'text-muted': '#6a7a9a',
        'cherry-pink': '#F9D0D4',
        'muted-rose': '#e8b4b8',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
