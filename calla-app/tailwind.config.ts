import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "emerald-brand": {
          DEFAULT: "#0D4F3C",
          50: "#E8F5F1",
          100: "#C5E5DA",
          200: "#8ECBB6",
          300: "#57B192",
          400: "#2E8A6D",
          500: "#0D4F3C",
          600: "#0A3F30",
          700: "#082F24",
          800: "#051F18",
          900: "#030F0C",
        },
        "gold-brand": {
          DEFAULT: "#E8C547",
          50: "#FDFAED",
          100: "#FAF0C4",
          200: "#F5E08A",
          300: "#EFD060",
          400: "#E8C547",
          500: "#D4AE28",
          600: "#A8891F",
          700: "#7C6417",
          800: "#504010",
          900: "#282008",
        },
        cream: "#FAFAF8",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
