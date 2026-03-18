/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        purple: '0 0 40px hsl(271 100% 64% / 0.25)',
        green: '0 0 40px hsl(157 87% 51% / 0.2)',
      }
    },
  },
  plugins: [],
}