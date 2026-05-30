# DrawData design tokens — bind every 3D output to these

3D output that uses raw `#ffffff`, primary blues, or "fortune wheel" colors will look out of place. Always reference the CSS custom properties below, and when you need a literal value (e.g., for a WebGL material), use the listed hex.

## Palette (defined in `styles/tokens.css`)

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0E0F13` | Page background. Never put 3D in front of pure black. |
| `--panel` | `#16181F` | Panel surfaces. Most cards. |
| `--panel2` | `#1C1F28` | Inner panels, inset wells. |
| `--text` | `#ECE9E0` | Primary text. Off-white, warm. |
| `--dim` | `#928F85` | Secondary text, labels. |
| `--edge` | `rgba(236, 233, 224, 0.08)` | All hairlines. |
| `--accent` | `#E9B84A` | The single warm accent. Amber. **Default for 3D highlights.** |
| `--cool` | `#5BC8B0` | Reference / "expected baseline" cool. Teal. |
| `--hot` | `#E1664C` | Sparingly used "myth-busted" coral. |

## Reading a CSS variable from a Canvas

`<Canvas>` runs outside the DOM cascade, so `getComputedStyle` is the bridge. Cache it:

```ts
const useTokens = () => {
  const [t, setT] = useState({ accent: "#E9B84A", cool: "#5BC8B0", ink: "#0E0F13" });
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    setT({
      accent: cs.getPropertyValue("--accent").trim() || "#E9B84A",
      cool: cs.getPropertyValue("--cool").trim() || "#5BC8B0",
      ink: cs.getPropertyValue("--ink").trim() || "#0E0F13",
    });
  }, []);
  return t;
};
```

Use it inside the scene component, not inside a child `<mesh>` (that would re-read it every frame).

## Fonts (already loaded site-wide)

| Family | Use in 3D |
|---|---|
| `Fraunces` (serif, display) | 3D titles only. Don't extrude or chrome it. Subtle bevel max. |
| `Hanken Grotesk` (body) | Almost never in 3D. If you must, use `drei`'s `<Text>` with low extrusion. |
| `JetBrains Mono` (numerals) | The right pick for any 3D number readout — match the rest of the site. |

Load via `drei`'s `<Text>` — point `font="/fonts/JetBrainsMono.woff"` only if you've added it locally (we currently load from Google Fonts CSS, which `<Text>` can't consume). For now, default to MSDF text via `<Text>` with no `font` prop (uses the included sans) only as a last resort; prefer overlaying real HTML over the canvas.

## Motion vocabulary

The site's existing motion language (from `components/motion/primitives.tsx`):

```ts
spring = { type: "spring", bounce: 0.4, duration: 1 }
ease   = { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
```

3D output should use the **same spring** for any hover/tap response so transitions feel of-a-piece with the rest of the site. For ambient (always-on) motion inside `useFrame`, use slow constants — `mesh.rotation.y += delta * 0.08` is plenty.

## Reduced motion (mandatory)

Every output must short-circuit when `useReducedMotion()` returns true.

- **Mode B (CSS-3D)**: drop the hover transforms entirely, keep static layout.
- **Mode A (R3F)**: render a still frame (no `useFrame` updates), or skip the Canvas entirely and render a static SVG/CSS fallback. The skeleton in `motion-patterns.md` shows the pattern.

## Z-stack discipline

The header is `z-40`, modals are `z-60+`, AgeGate is `z-100`. A 3D `<Canvas>` mounted as a hero background should be `absolute inset-0 -z-0` inside its container with the hero text at `relative z-10`. Never give a Canvas a positive top-level z-index that competes with the header or modals.

## Performance budget

| Asset | Limit |
|---|---|
| Particles in a single scene | ≤ 200 (≤ 400 if `intensity = "bold"`) |
| Lights | ≤ 3 (1 ambient + 2 directional / point) |
| Meshes with custom shaders | ≤ 2 |
| `pixelRatio` | `Math.min(window.devicePixelRatio, 1.5)` |
| Frame skip on mobile | Set `frameloop="demand"` if scene is mostly static |
| Bundle size for the page | +200 KB max for the R3F components (lazy-loaded) |

If a request would blow these budgets, push back in your one-paragraph brief to the user and propose a lighter alternative (often Mode B does the same job).
