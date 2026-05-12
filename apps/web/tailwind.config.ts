import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#0e7c7b",
        ink: "#17211f",
        paper: "#f5f7f4"
      }
    }
  },
  plugins: []
};

export default config;

