import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#6B7FA3",
          green: "#7BAD8C",
          gold: "#D4A962",
          purple: "#A89DBF",
          pink: "#C97B7B",
          bg: "#F8F9FA",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Pretendard Variable", "Apple SD Gothic Neo", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
