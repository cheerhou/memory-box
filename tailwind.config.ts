import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "memory-cream": "#FDF8F3",
        "memory-rose": "#F7CACA",
        "memory-ink": "#2F2A26"
      }
    }
  },
  plugins: []
};

export default config;
