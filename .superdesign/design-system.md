# BookingFunnel Design System

## Product context

BookingFunnel is a compact conversational lead-qualification experience. The initial `/conversations/start` screen gathers a lead's name and email, starts a backend conversation, and hands the user into the qualification flow. The interface should feel friendly and trustworthy without becoming a marketing hero page.

The qualification route is a backend-driven conversational workspace. It groups history into collapsible metric sections, keeps the active section visually dominant, shows subtle backend-provided progress, and maps backend `next_action` values to either a normal answer field, deterministic pursuit controls, a booking CTA, an automatic transition, or a terminal state. Previous metric sections remain reopenable and editable without becoming visually equal to the active section.

## Reference composition

The supplied `public/start_route_UI.png` is the visual source of truth. It shows a restrained desktop SaaS layout on a very pale gridded background. A small `Single Grain` wordmark sits above a centered rounded card. The card is split into two columns: a softly tinted left panel with the real `public/kenzo_waving.png` mascot, greeting, explanatory copy, and a compact reassurance badge; and a white right panel with a concise heading, supporting sentence, two labeled inputs, a full-width purple action button, and centered terms copy. On smaller screens the same relationships should stack naturally rather than rely on fixed positioning.

## Color system

Use only the semantic palette supplied in the task: surface/background `#fff7fb`, on-surface `#241728`, on-surface-variant `#504250`, outline `#827282`, outline-variant `#d4c1d2`, primary `#8a19a2`, primary-container `#a63abd`, secondary `#874197`, secondary-container `#ee9ffc`, tertiary `#5d4e62`, and the corresponding surface, inverse, fixed, and error roles. The complete canonical token list belongs in `app/globals.css`; components consume semantic Tailwind utilities and CSS variables, never scattered hex literals.

## Typography

Use Geist Sans. Typography is compact and conversational: h1 around 1.65rem, h2 around 1.25rem, h3 around 1.1rem, h4 around 1rem, and body copy around 0.95rem with comfortable 1.5–1.6 line height. Headings use 650–700 weight and tight but not display-scale tracking. Labels and fine print remain legible at 0.75–0.8rem.

## Components and layout

- Main card: white/tinted split surface, subtle outline, approximately 1.25rem radius, no heavy shadow.
- Inputs: about 2.75rem high, white surface, subtle outline-variant border, 0.6rem radius, clear primary focus ring.
- Primary button: approximately 2.75rem high, primary-container fill, white text, 0.6rem radius, restrained hover/pressed motion.
- Status badge: pale primary-fixed surface, small semibold text.
- Error state: error-container surface and on-error-container text.
- Desktop content width should stay close to the reference card's proportions; mobile uses one column with comfortable 1.25rem gutters.
- Conversation desktop shell: compact product/Kenzo header above a spacious two-column workspace, with a narrow section navigator/history rail and a wide active conversation region. Avoid a tiny centered chat column.
- Metric blocks: one coherent section per backend metric; inactive sections use quiet surface containers, while the active section uses a primary-tinted outline and expanded content.
- Assistant messages: grouped editorial conversation rows with a small real Kenzo image, not noisy Messenger-style bubbles.
- User messages: compact right-aligned responses within their owning metric block.
- Deterministic actions: touch-friendly button groups immediately following Kenzo's response; normal input is not shown when a deterministic action owns the state.
- Mobile conversation: a single stacked column, compact Kenzo avatar, full-width metric cards, and action/input controls that never overflow horizontally.

## Motion and behavior

Use 150–200ms ease-out transitions for hover, focus, and disabled states. Respect reduced-motion preferences. Loading must prevent duplicate submissions. Validation and API failures should be announced accessibly without raw backend details.

## Asset rules

Use `public/kenzo_waving.png` unchanged with preserved aspect ratio. Never replace it with an emoji, placeholder, generated illustration, CSS drawing, or alternate mascot.
