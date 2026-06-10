import type { Config } from "tailwindcss";

/**
 * Tailwind config — Phase 1 design system.
 *
 * Additive on top of the existing tokens: every legacy name (ink, panel,
 * accent, cool, hot, fade-up, etc.) is preserved so the ~56 .tsx files
 * already in the codebase keep compiling. New role-named tokens are
 * available alongside for Phase 4 migration.
 *
 * The CSS custom properties themselves live in styles/tokens.css.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // ─── Color ───
      colors: {
        // Legacy short names — DO NOT REMOVE (used across the app).
        ink: "var(--bg-base)",
        panel: "var(--bg-elevated)",
        panel2: "var(--bg-surface)",
        text: "var(--text-primary)",
        dim: "var(--text-tertiary)",
        edge: "var(--edge-default)",
        accent: "var(--accent-brand)",
        cool: "var(--data-fair)",
        hot: "var(--data-divergent)",

        // New role-named tokens — preferred for any new code.
        bg: {
          base: "var(--bg-base)",
          elevated: "var(--bg-elevated)",
          surface: "var(--bg-surface)",
        },
        fg: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          quiet: "var(--text-quiet)",
        },
        hairline: {
          DEFAULT: "var(--edge-default)",
          hover: "var(--edge-hover)",
        },
        brand: {
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
          900: "var(--accent-900)",
          DEFAULT: "var(--accent-brand)",
        },
        data: {
          fair: "var(--data-fair)",
          divergent: "var(--data-divergent)",
        },
      },

      // ─── Type families ───
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },

      // ─── Fluid type scale (use these instead of arbitrary text-[Npx]) ───
      fontSize: {
        hero: ["var(--text-hero)", { lineHeight: "var(--leading-hero)", letterSpacing: "var(--tracking-hero)" }],
        h1: ["var(--text-h1)", { lineHeight: "var(--leading-headline)", letterSpacing: "var(--tracking-headline)" }],
        h2: ["var(--text-h2)", { lineHeight: "var(--leading-headline)", letterSpacing: "var(--tracking-headline)" }],
        h3: ["var(--text-h3)", { lineHeight: "var(--leading-tight)", letterSpacing: "-0.01em" }],
        h4: ["var(--text-h4)", { lineHeight: "var(--leading-tight)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        small: ["var(--text-small)", { lineHeight: "1.5" }],
        caption: ["var(--text-caption)", { lineHeight: "1.4", letterSpacing: "var(--tracking-caption)" }],
        "data-label": ["0.6875rem", { lineHeight: "1", letterSpacing: "var(--tracking-data)" }],
      },
      letterSpacing: {
        hero: "var(--tracking-hero)",
        headline: "var(--tracking-headline)",
        caption: "var(--tracking-caption)",
        data: "var(--tracking-data)",
      },
      lineHeight: {
        hero: "var(--leading-hero)",
        headline: "var(--leading-headline)",
        body: "var(--leading-body)",
        tight: "var(--leading-tight)",
      },

      // ─── Spacing ───
      spacing: {
        section: "var(--section-y)",
      },
      maxWidth: {
        narrow: "var(--container-narrow)",
        wide: "var(--container-wide)",
        prose: "var(--container-prose)",
      },

      // ─── Radii — exactly four (sm/md/lg/pill) ───
      borderRadius: {
        sm: "var(--r-sm)",   // 8px
        md: "var(--r-md)",   // 14px
        lg: "var(--r-lg)",   // 24px
        pill: "var(--r-pill)", // 999px
      },

      // ─── Shadows ───
      boxShadow: {
        card: "var(--shadow-card)",
        panel: "var(--shadow-panel)",
        modal: "var(--shadow-modal)",
        glow: "var(--shadow-glow-brand)",
      },

      // ─── Backgrounds ───
      backgroundImage: {
        "grid-dim":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-amber":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(233,184,74,0.12), transparent 70%)",
        "gradient-cta": "var(--gradient-cta)",
      },

      // ─── Motion ───
      transitionTimingFunction: {
        premium: "var(--ease-premium)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        micro: "150ms",
        standard: "300ms",
        entrance: "600ms",
        hero: "900ms",
      },
      animation: {
        "fade-up": "fadeUp 0.6s var(--ease-premium) both",
        "fade-in": "fadeIn 0.6s var(--ease-premium) both",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
