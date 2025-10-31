import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "memory-paper": "#fdfaf6",
        "memory-coral": "#E87A6D",
        "memory-text": "#333333",
        "memory-muted": "#666666"
      },
      boxShadow: {
        "memory-card": "0 4px 12px rgba(0,0,0,0.03)"
      },
      fontFamily: {
        script: [
          "var(--font-script-cn)",
          "var(--font-script-en)",
          "cursive"
        ],
        accent: [
          "var(--font-accent)",
          "var(--font-script-cn)",
          "cursive"
        ],
        button: [
          "var(--font-button)",
          "system-ui",
          "sans-serif"
        ],
        signature: [
          "var(--font-signature)",
          "var(--font-script-cn)",
          "cursive"
        ],
        sans: ["system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
