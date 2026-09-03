import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx,css}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        secondary: "#5e5e5e",
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#444748",
        outline: "#747878",
        "outline-variant": "#c4c7c7",
        surface: "#f9f9f9",
        "surface-bright": "#f9f9f9",
        "surface-container": "#eeeeee",
        "surface-container-low": "#f3f3f3",
        "surface-container-high": "#e8e8e8",
        "surface-container-highest": "#e2e2e2",
        "surface-container-lowest": "#ffffff",
        "surface-tint": "#5f5e5e",
        manus: "#1a3d2e",
      },
      fontFamily: {
        display: ["var(--font-hanken)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      fontSize: {
        eyebrow: ["10px", { lineHeight: "12px", letterSpacing: "0.15em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "500" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "500" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-mobile": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px" }],
        "label-mono": ["12px", { lineHeight: "16px" }],
      },
      maxWidth: {
        mobile: "414px",
      },
      spacing: {
        gutter: "24px",
        "container-padding": "32px",
        "element-gap": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
