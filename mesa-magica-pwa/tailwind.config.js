/** @type {import('tailwindcss').Config} */
  module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'instamart-green': '#00A651',
          'instamart-orange': '#F15A24',
        },
        screens: {
          'sm': '640px',
          'md': '768px',
          'lg': '1024px',
        },
      },
    },
    plugins: [],
  }