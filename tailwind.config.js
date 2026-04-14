/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        void: "#080808",
        "neon-blue": "#00D4FF",
        "neon-green": "#39FF14",
        "neon-purple": "#BF40FF",
        "neon-red": "#FF073A",
        "neon-yellow": "#F3F315",
        surface: "#111111",
        "surface-light": "#1A1A1A",
      },
    },
  },
  plugins: [],
};
