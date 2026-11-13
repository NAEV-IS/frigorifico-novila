/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./index.template.html"],
  theme: {
    extend: {
      colors: {
        novila: {
          burgundy: "#6B091E",
          wine: "#580617",
          dark: "#3E0412",
          gold: "#B58E3E",
          goldLight: "#D8B56A",
          charcoal: "#141414",
          cream: "#FAF8F5",
          paper: "#F7F4EE",
          surface: "#FDFBF7",
          raised: "#EFE9DF",
          ink: "#1F1B16",
          secondary: "#5E554A",
          muted: "#7B7266",
          line: "rgba(31,27,22,.08)",
          green: "#1F6F43",
          whatsapp: "#075E54",
          waGreen: "#25D366",
        },
      },
      fontFamily: {
        display: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        premium: "0 24px 80px -20px rgba(20,20,20,.45)",
        phone: "0 40px 100px -20px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.08)",
        card: "0 10px 30px -14px rgba(20,20,20,.18)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cardIn: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        bubbleIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateX(24px) scale(.97)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".4" },
        },
        ring: {
          "0%": { boxShadow: "0 0 0 0 rgba(181,142,62,.45)" },
          "70%": { boxShadow: "0 0 0 10px rgba(181,142,62,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(181,142,62,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp .45s cubic-bezier(.22,1,.36,1) both",
        cardIn: "cardIn .45s cubic-bezier(.22,1,.36,1) both",
        bubbleIn: "bubbleIn .25s cubic-bezier(.22,1,.36,1) both",
        toastIn: "toastIn .35s cubic-bezier(.22,1,.36,1) both",
        pulseSoft: "pulseSoft 1.8s ease-in-out infinite",
        ring: "ring 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
