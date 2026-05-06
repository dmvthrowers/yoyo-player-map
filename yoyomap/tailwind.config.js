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
        'brand-red': '#B80000',
        'brand-red-dark': '#9c0000',
        'navy': '#102040',
        'navy-deep': '#0e1833',
        'dark-navy': '#0e1833',
        'cream': '#fffdfa',
        'cream-mid': '#f0ebe0',
        'hairline': '#d4cebc',
        'text-body': '#3a4a6a',
        'text-muted': '#6a7a9a',
        'cherry-pink': '#F9D0D4',
        'muted-rose': '#e8b4b8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
