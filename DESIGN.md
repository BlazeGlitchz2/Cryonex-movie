# Cryonex Design Direction

Identity: a personal cinema in a dark room, rebuilt as a spatial media
theater in the visionOS idiom. The window itself is smoked glass over
the desktop; the artwork is the light source. The signature motif stays
ambient spill: backdrop art tints the interface glow, so every screen
feels themed by the movie itself, not by a brand color.

Reading this as: desktop cinema hub for one viewer, warm charcoal
smoked-glass style, dial ENERGY 2 / RHYTHM 2 / MOTION 3.

## Spatial Smoked Glass architecture

- Native window: transparent + `underWindowBackground` vibrancy, Overlay
  title bar. macOS owns the window corner radius. Window glass is ON by
  default (owner-requested; this is the design, not an option bolted on).
  `useAppearanceStore.windowGlass` (persist v2) keeps the off switch.
- Shell: fixed left sidebar (230px, `.material-sidebar`) with brand,
  search pill, Browse and Library nav groups, sources entry, and the
  window glass status line. Right column: TopBar (route section header +
  active server quick-switch) above the scrollable canvas
  (`#canvas-scroll`). Routes live in `src/App.tsx`, layout in
  `src/components/shell/`.
- Home: asymmetric bento spotlight hero (radius-hero 20px), then rows.
- Floating bottom mini-player dock (`.material-dock`, radius-hero):
  thumbnail, title, `S{n} E{m}` or Movie, provider name, resume play,
  prev/next episode for tv, cycle-server, dismiss.
- Modals: `.material-modal`, solid-leaning, radius-hero.

## R-17 honesty decisions (override the pasted master spec)

1. The fabricated "98% Match" metric never ships. The real TMDB score
   renders, in emerald.
2. The mini-player dock shows no progress bar and no timestamp.
   Cross-origin embeds cannot report playback time, so the dock carries
   resume controls only.
3. Videasy is dead (DNS). The server engine keeps the sixteen verified
   providers (ten primary plus six backups); nothing links to a dead
   host.

## Tokens

See `src/index.css` `@theme`.

- Canvas `#121312`, warm charcoal. Surfaces `#161614` and `#1A1A17`.
  Reason: elevation in a dark theater reads as lightness, not shadow;
  hairline rims `rgba(255,255,255,0.08)` replace borders-as-decoration,
  stronger rim `rgba(255,255,255,0.12)` for dock and modal edges.
- Ink `#F5F5F7`, ink-dim `rgba(255,255,255,0.65)`. ink-dim composites to
  about `#ACACAC` on canvas, roughly 6.4:1, passes WCAG AA.
- Accent: near-white `#e5e7eb`. Primary buttons stay white with dark
  text (Netflix grammar below). No brand red, no blue-purple.
- Emerald `#46D369`: the single attention color. Purpose: ratings and
  real live-status markers only (window glass dot, active server dot,
  selected server check). Never buttons, never decoration.
- Radii: `--radius-hero` 20px (hero, bento, dock, dropdowns), 
  `--radius-card` 16px, `--radius-ctl` 12px, pills full round.
- Materials (class contract, see `index.css`): `.material-shell`,
  `.material-sidebar`, `.material-card`, `.material-dock`,
  `.material-modal`. `.glass-surface` is an alias of `.material-card`
  for backwards compat.
- Window glass mode: `html[data-window-glass="true"]` turns the tokens
  translucent in one shot (canvas alpha 0.6) so the native macOS
  under-window blur reads through the whole app. Off: solid warm charcoal.

## Typography

- Display: Sora. Reason: geometric cinema-poster voice for the wordmark,
  hero fallback titles, and section headers.
- Body: system stack (SF Pro on macOS). Reason: native desktop app, match
  the platform's UI voice for dense metadata.

## Motion, MOTION 3

Creative but choreographed, every piece has a purpose:

- Hero: crossfade between trending titles every 9 seconds, slow Ken Burns
  drift (`kenburns` class exists). Purpose: the room breathes without
  autoplay audio.
- Rows: cards stagger in once (80ms offsets), hover lifts with a spring.
  Purpose: depth cue for scroll affordance.
- Sidebar active pill slides between items (`layoutId="side-active"`).
  Purpose: one continuous object, not blinking tabs.
- Watch transition: hero or card play click flows into the theater view
  with a fade and scale, ambient tint carried over. Purpose: continuity
  of place.
- Skeleton shimmer everywhere data loads (`shimmer` class exists), never
  bare spinners.
- Modals: spring scale with fade, exits faster than entrances.
- No looping pulses, no floating loops, no confetti.

## Icon dose

Lucide, sparse and content-relevant: Play, Plus, Search, X, History,
Clock, Server, Home, Flame, Monitor, Film, ChevronLeft, ChevronRight,
Sun/Moon-class toggles only when they mark a real state. The library look
is accepted as a deliberate set choice for a minimal desktop tool.

## Copy voice

Plain, short, human. Buttons say what they do: "Play now", "Trailer",
"My List". Empty states say why they are empty and what fills them.
No em dash, ever.

## Button grammar (Netflix-researched, adopted)

Netflix facts from research: Play is the dominant white button (16px/700,
radius 4px, padding 8px 24px, leading play glyph, hover dims the fill to
about 75% opacity, never a shadow); the secondary "More Info" button is
grey at 70% that lightens on hover; circular icon buttons are 40 to 44px,
rgba(42,42,42,0.6) fill, 2px white/50 border that brightens on hover;
elevation on dark canvases comes from fill contrast, not shadows.

Cryonex adoption (primary stays white, accent color is never a button):

- Primary "Play now": h-11 px-7, rounded-lg, bg-accent text-canvas,
  font-bold, leading Play icon 20px. Hover: fill shifts toward white/80
  (250ms ease-in-out, no scale, no shadow). Press: scale 0.96.
- Secondary "Trailer": same height and radius, bg-white/10 text-ink
  font-bold, leading Clapperboard icon. Hover: bg-white/20.
- Circle icon buttons (watchlist, dock transport, hover-card actions):
  size-10 rounded-full bg-white/5 border-2 border-white/50,
  hover:border-white, icon 20px, press 0.94. Dock uses size-9 for
  cycle-server and dismiss to keep the 64px dock height honest.
- Chips and server pills keep the pill idiom; they are metadata, not
  buttons, and stay outside this grammar.
- No shadows, no glow, no gradients, on any button. Focus ring global.

## Motion, v2: slower cinematic (Netflix-researched)

Netflix and NN/g findings: micro-interactions around 250ms ease-in-out;
entrances run longer than exits (roughly 300ms in, 200-250ms out);
ambient content transitions reach 800-1000ms; everything animates
transform and opacity only.

Cryonex timing tiers, ease-in-out family, token
`cubic-bezier(0.4, 0, 0.2, 1)`:

- Micro (hovers, presses, chips): 250ms.
- Component (card lifts, panels, pills, toasts): 350 to 450ms.
- Stage (page transitions, hero crossfades, modal settles): 550 to
  750ms. Exits at 250 to 350ms.
- Ambient (spill bloom, hero rotation drift): 800 to 1000ms.
- Springs when used: stiffness 180, damping 24 (heavier than before).
- Stagger: 80ms, never per-frame cascades.
- Replace every existing [0.22, 1, 0.36, 1] usage with the new token.
- Reduced-motion global kill stays.

## Glass modes (owner-requested, R-37 lineage)

- Window glass: ON by default, persisted in `useAppearanceStore`
  (version 2, one-time migrate flips stored false to true). Toggle in
  Sources modal, Appearance section. This is an explicit owner override
  of the old off-by-default rule; the spatial theater is built on it.
- Glass surfaces: still an owner option, default off. When on, elevated
  surfaces (modal panels, toasts, hover info panels, server bar, sort
  control, episode cards) use `.glass-surface` (alias of
  `.material-card`) in index.css. Posters and artwork never glass.
  The dock is glass in both modes.
- Ambient backdrop: ON by default, owner-requested. Three blurred
  projector lights (emerald and warm white, the palette's own colors)
  drift on 80 to 120 second transform loops behind the glass. Desktop
  only, hidden below lg for phone GPU budgets; the global
  reduced-motion kill freezes the drift. Purpose: the room keeps
  breathing between artwork spills.
