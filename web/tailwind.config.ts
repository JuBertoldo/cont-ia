import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00E676",
          dark: "#00C853",
          light: "#69F0AE",
        },
        surface: {
          DEFAULT: "#111111",
          card: "#1a1a1a",
          border: "#2a2a2a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
