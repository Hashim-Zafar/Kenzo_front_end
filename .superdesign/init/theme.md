# Theme

## Compact token summary

- Framework: Tailwind CSS 4 through `@tailwindcss/postcss`
- Font families: Geist Sans (`--font-geist-sans`), Geist Mono (`--font-geist-mono`)
- Colors: `background` is `#ffffff` and `foreground` is `#171717`; dark media overrides are `#0a0a0a` and `#ededed`
- Spacing, radii, shadows, and breakpoints: Tailwind CSS 4 defaults

## Raw source

### `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

### `postcss.config.mjs`

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

No `tailwind.config.*` file exists; the project uses Tailwind CSS 4 CSS-first configuration.
