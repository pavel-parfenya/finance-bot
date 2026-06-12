import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        cream: "#f7f5ef",
        ink: "#171a3d",
        accent: {
          DEFAULT: "#3f43b8",
          dark: "#2e3290",
          soft: "#e4e5f7",
        },
        gold: {
          DEFAULT: "#d4af6a",
          soft: "#f4ead2",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(23, 26, 61, 0.05), 0 8px 24px rgba(23, 26, 61, 0.08)",
        lift: "0 20px 60px -20px rgba(23, 26, 61, 0.35)",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("@tailwindcss/typography")],
};

export default config;
