---
name: drawdata-3d-motion
description: Add 3D motion, depth, parallax, or ambient WebGL touches to DrawData panels, cards, and sections using React Three Fiber. Use this skill whenever the user wants something on the DrawData lottery analytics site to "feel 3D", asks for tilt-on-hover, depth-stacked cards, parallax scenes, ambient particles, orbital backgrounds, or any volumetric/animated touch on a panel or page. Also triggers for vague signals like "make this pop", "add some motion", "the panels feel flat", "make the hero more cinematic", "give it some depth", or any request mentioning a 3D scene, glow orb, particle field, or floating element in this codebase. Lean toward triggering rather than skipping — even ambiguous "spice this up" requests in a panel-editing context are usually a fit.
---

# DrawData 3D motion

This skill produces React Three Fiber components and JSX patches that bring 3D depth and motion to the DrawData site, while staying inside the existing design language (ink/panel/amber tokens, Fraunces/Hanken Grotesk/JetBrains Mono fonts, restrained scientific-instrument feel).

Use it when a panel needs to feel less flat — without overwhelming the data.

## Inputs you accept

The user provides a **structured spec**. Either a JSON object or a few short bullets — both are fine. Cover these fields:

- `target` — file path + element to enhance, OR `"new"` for a fresh component
- `pattern` — one of: `tilt`, `parallax`, `orbit`, `particles`, `depth-stack`, `glow-orb`, `floating-card`, `hero-scene`
- `intensity` — `subtle` (default) | `medium` | `bold`
- `accent` — `amber` (default, `--accent`) | `cool` (`--cool` teal) | `hot` (`--hot` coral) | `mixed`
- `motion` — `idle` (only on hover/scroll) | `ambient` (always animating) | `interactive` (mouse-driven)
- `notes` — anything else (reduced-motion behavior, mobile, perf budget)

If the user gave a free-form description instead of a spec, read it carefully and fill in the fields yourself with sensible defaults. Don't ask for clarification unless something critical is genuinely unclear.

## Output

Two delivery modes — pick the one the request actually needs.

### Mode A: New React Three Fiber component

A standalone `.tsx` file in `components/3d/` that renders a `<Canvas>`-based scene. Used for hero backgrounds, ambient particle fields, decorative orbital scenes — anything that doesn't need to wrap an existing element.

**Lazy-load it.** R3F + three is large (~150 KB gzipped); never include it in the initial bundle of static pages. Always wrap in `next/dynamic` with `ssr: false`:

```tsx
import dynamic from "next/dynamic";
const HeroScene = dynamic(() => import("@/components/3d/HeroScene"), {
  ssr: false,
  loading: () => <div className="h-[420px]" />,
});
```

### Mode B: JSX patch on an existing panel

A targeted edit that wraps the panel in a motion behavior — usually CSS-3D + Framer Motion, not WebGL. Used for tilt-on-hover cards, parallax depth, hover-glow. Doesn't pull in three; works on any panel today.

Pick Mode B by default for individual panels, cards, stat blocks. Pick Mode A only when the spec asks for a scene, background, or visible 3D object.

## DrawData house style — don't violate

Every output must honor these or the result will look out of place. Read `references/design-tokens.md` for the full palette + font notes.

- **Reduced-motion respect is mandatory.** Use `useReducedMotion()` from `framer-motion` and short-circuit to a static state. The site already pledges this for all motion.
- **Dark + restrained.** Background ambient must stay below the eye line of the data. No bright cheerful colors. Amber is the only warm accent; teal is the cool baseline.
- **No emoji, no cartoonish materials.** Subtle metals, soft glows, glass — yes. Mario coins or fortune wheels — no.
- **18+ honest framing carries over.** No "lucky" iconography, no spinning slot machines, no "play to win" visual cues. The site is descriptive analytics.
- **Performance budget.** A single Canvas per page (rarely two). Cap pixel ratio at 1.5 on mobile. Limit particles to ≤ 200 unless `intensity = "bold"` and the user explicitly accepts the cost.

## Motion patterns

These are the eight named patterns. Each has a canonical implementation in `references/motion-patterns.md` — read that file for code skeletons before writing output. The table below is a quick selector.

| Pattern | What it does | Mode | Good for |
|---|---|---|---|
| `tilt` | Cards tilt toward mouse on hover | B (CSS-3D) | Stat cards, panel headers |
| `parallax` | Inner layers shift at different speeds on scroll/mouse | B (CSS-3D) | Hero cards, picker tiles |
| `orbit` | Slow camera-orbit around a centered object | A (R3F) | Page heroes, About hero |
| `particles` | Drifting ambient points in 3D space | A (R3F) | Page backgrounds (very subtle) |
| `depth-stack` | Multiple panels stacked with z-offset, animated on hover | B (CSS-3D) | Game-card grids |
| `glow-orb` | Soft pulsing volumetric light | A (R3F) | Empty-state panels, lab idle state |
| `floating-card` | Single panel with subtle bob + shadow | B (CSS-3D + Framer) | Hero cards, modal entries |
| `hero-scene` | Composed scene with multiple objects + orbit + glow | A (R3F) | `/` and `/picker` heroes only |

## Workflow

1. **Read the spec.** Identify pattern + target + mode (A or B).
2. **Read `references/motion-patterns.md`** for the chosen pattern's skeleton.
3. **For Mode A only**, check `package.json`:
   - If `@react-three/fiber`, `@react-three/drei`, and `three` are missing, tell the user the install command they need to run before the component will work. Don't run npm yourself unless they ask.
4. **Generate the file or patch.** Match DrawData tokens (no hardcoded colors — use `var(--accent)`, etc.).
5. **Wire it up** if Mode A:
   - Add the `next/dynamic` import to the target page
   - Show the user where it mounts
6. **Honor reduced motion** — every output must include the short-circuit. This is non-negotiable.
7. **Brief the user** in one short paragraph: what you generated, where it lives, what they need to do (install deps, where to drop the import), and any perf caveats.

## When NOT to use Mode A

Skip the WebGL path and use Mode B (or just decline) when:

- The target is a chart panel that already renders Recharts SVG. Two animated layers on top of each other fight visually.
- The user is on a route that's already heavy (Formula Lab, Positional). Adding R3F there would cross the bundle budget.
- The spec asks for something the analytics already do (a "spinning data orb" instead of just looking at the actual frequency chart). Politely note it and propose a CSS-3D enhancement to the real chart instead.

## Examples

### Example 1 — spec: tilt the home game cards

```yaml
target: app/page.tsx, the GAMES.map cards
pattern: tilt
intensity: subtle
motion: interactive
notes: keep with the existing StaggerItem; don't break stagger
```

Action: Mode B patch. Wrap each card in a `motion.div` with `whileHover={{ rotateX, rotateY }}` driven by mouse position, `transformStyle: "preserve-3d"`. Output the modified JSX block + the new helper hook `useTiltHover()` saved to `components/motion/useTiltHover.ts`.

### Example 2 — spec: hero scene on /

```yaml
target: app/page.tsx, the radial-amber hero
pattern: hero-scene
intensity: medium
accent: mixed
motion: ambient
notes: must respect prefers-reduced-motion; lazy-load
```

Action: Mode A. Create `components/3d/HomeHero.tsx` with a small R3F scene — a slow-orbiting amber glow torus over a teal particle drift, drei `<Float>` for soft bob. Add `next/dynamic` import in `app/page.tsx` mounting it absolutely behind the existing hero text. List the three deps the user needs to install.

### Example 3 — spec: glow orb in Lab idle state

```yaml
target: app/lab/LabView.tsx, the empty/idle state before backtest runs
pattern: glow-orb
intensity: subtle
accent: amber
motion: idle
```

Action: Mode A but extremely small (one mesh + light + bloom). Wrap in `next/dynamic`. Only ~30 lines of R3F. Mount only when no result is present.

## Reference files

- `references/design-tokens.md` — DrawData palette, fonts, spacing, motion vocabulary
- `references/motion-patterns.md` — full code skeletons for all 8 patterns
- `scripts/scaffold-3d.ts` — Node script that creates a boilerplate Mode-A component file from a pattern name

When in doubt, defer to the references; the SKILL.md is the dispatcher.
