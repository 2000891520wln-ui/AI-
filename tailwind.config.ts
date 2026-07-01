import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        destructive: "hsl(var(--destructive))"
      },
      boxShadow: {
        polaroid: "0 22px 48px rgba(74, 48, 18, 0.18)",
        journal: "0 20px 70px rgba(68, 43, 16, 0.12)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        journal: ["Kaiti SC", "LXGW WenKai", "ui-serif", "serif"]
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;
