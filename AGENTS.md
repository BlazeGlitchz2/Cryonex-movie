# Project Rules: Cryonex

Personal desktop cinema hub. React 19 + TypeScript strict inside Tauri v2.
Design system lives in `DESIGN.md`. Read it before any UI work.

## Commands

- Dev: `npm run dev` (port 1420, strict)
- Typecheck: `npx tsc -b`
- Build web: `npm run build`
- Tauri dev: `npm run tauri dev`
- Tauri release: `npm run tauri build`

## Stack

React 19, TypeScript strict, Tailwind CSS v4 (tokens via `@theme` in
`src/index.css`), Framer Motion, Zustand (persist middleware, localStorage
key `cryonex-store`, namespaced per profile, see Profiles contracts),
TanStack Query, react-router-dom, fast-average-color,
Lucide icons (sparse, content-relevant only).

## Architecture: Spatial Smoked Glass

Fixed left sidebar (230px), scrollable canvas column with a TopBar, Home
bento spotlight, floating bottom mini-player dock, native macOS
under-window vibrancy. Layout files: `src/components/shell/AppShell.tsx`
(row: Sidebar + canvas column), `src/components/shell/Sidebar.tsx`,
`src/components/shell/TopBar.tsx`, `src/components/dock/MiniPlayerDock.tsx`.
The scroll container of the whole app is the `<main id="canvas-scroll">`
inside AppShell; route changes reset it (App.tsx ScrollToTop). Never mount
a second page-level scroll, never scroll the window.

## Material class contracts (defined in `src/index.css`, use verbatim)

- `.material-shell`: rgba(22,22,19,0.82), blur(48px) saturate(165%).
- `.material-sidebar`: rgba(14,14,13,0.45), right hairline
  rgba(255,255,255,0.06).
- `.material-card` (alias `.glass-surface`): rgba(24,24,21,0.55),
  hairline border. Backwards compat: existing `glass` mode code keeps
  using `.glass-surface`.
- `.material-dock`: rgba(25,25,23,0.85), blur(28px) saturate(160%),
  rim border rgba(255,255,255,0.12).
- `.material-modal`: rgba(20,20,19,0.92), rim border.
- Emerald token `--color-emerald` (#46D369): ratings and real live-status
  only. Never buttons, never decoration. Primary buttons stay white.

## File ownership map

Never create or edit a file outside your assigned list.

- Data layer: `src/services/tmdb.ts`, `src/store/useAppStore.ts`,
  `src/store/useUIStore.ts`
- Profiles: `src/store/useProfileStore.ts`,
  `src/services/profileStorage.ts`, `src/components/profile/**`
- Tauri shell: `src-tauri/**`, `"tauri"` npm scripts
- App shell and tokens: `src/App.tsx`, `src/index.css`, `index.html`,
  `DESIGN.md`, `AGENTS.md`, `src/store/useAppearanceStore.ts`,
  `src/components/shell/**`, `src/components/dock/**`
- UI content: `src/components/home/**`, `src/components/shared/**`,
  `src/pages/HomePage.tsx`, `src/pages/MoviesPage.tsx`,
  `src/pages/SeriesPage.tsx`, `src/pages/MyListPage.tsx`,
  `src/pages/NewAndPopularPage.tsx`,
  `src/pages/ContinueWatchingPage.tsx`
- Watch experience: `src/pages/WatchPage.tsx`, `src/components/watch/**`
- Overlays: `src/components/search/CommandPalette.tsx`,
  `src/components/settings/SourcesModal.tsx`,
  `src/hooks/useKeyboardShortcut.ts`
- App wiring: `src/main.tsx`, deletion of template boilerplate

Deleted in the shell redesign (do not resurrect): the floating Navbar and
the HeroBanner; navigation is the sidebar, the hero is the Home bento.

Shared and already written, do not rewrite: `src/types/media.ts`,
`vite.config.ts`, `.env`.

## Contracts

### Services (`src/services/tmdb.ts`)

API key: `import.meta.env.VITE_TMDB_API_KEY`. If the key is missing or a
request fails, throw a typed `TmdbError` with a human message; the UI shows
error states, never swallows.

- `tmdbImageUrl(path: string, size: "w500" | "w780" | "w1280" | "original"): string`
- `fetchTrendingAll(): Promise<MediaItem[]>`
- `fetchPopularMovies(): Promise<MediaItem[]>`
- `fetchTopRatedMovies(): Promise<MediaItem[]>`
- `fetchUpcomingMovies(): Promise<MediaItem[]>`
- `fetchPopularTv(): Promise<MediaItem[]>`
- `fetchTopRatedTv(): Promise<MediaItem[]>`
- `fetchAiringTodayTv(): Promise<MediaItem[]>`
- `searchMulti(query: string): Promise<MediaItem[]>`
- `fetchMediaDetails(mediaType: MediaType, id: number): Promise<MediaDetails>`
  with `append_to_response=images,videos,credits,similar`. Map
  `images.logos` to `titleLogos`, preferring `iso_639_1 === "en"`, falling
  back to `iso_639_1 === null`, highest `vote_average` first.
- `fetchSeasonEpisodes(tvId: number, seasonNumber: number): Promise<Episode[]>`
- `fetchGenres(mediaType: MediaType): Promise<Genre[]>`
- `fetchByGenre(mediaType: MediaType, genreId: number): Promise<MediaItem[]>`
  via `/discover/{mediaType}` with `sort_by=popularity.desc` and
  `vote_count.gte=50`.

TMDB field differences: movie uses `title`/`release_date`/`runtime`, tv uses
`name`/`first_air_date`/`episode_run_time`. Map both into `MediaItem` and
`MediaDetails`. Never leak raw TMDB shapes past `tmdb.ts`.

TanStack Query keys, use exactly these:
`["trending"]`, `["popular-movies"]`, `["top-rated-movies"]`,
`["upcoming-movies"]`, `["popular-tv"]`, `["top-rated-tv"]`,
`["airing-today-tv"]`, `["search", query]`, `["details", mediaType, id]`,
`["episodes", tvId, seasonNumber]`, `["genres", mediaType]`,
`["by-genre", mediaType, genreId]`.

Stale time 5 minutes, `refetchOnWindowFocus: false`.

### Store (`src/store/useAppStore.ts`)

One persisted store, key `cryonex-store`, namespaced by active profile
through `profileStorage` (see Namespaced storage rule). Persist
`watchlist`, `continueWatching`, `providers`, `activeProviderId`. Do not
persist `cinemaDim` (use `partialize`).

State and actions:

- `watchlist: WatchlistEntry[]`
  `isInWatchlist(id: number, mediaType: MediaType): boolean`,
  `toggleWatchlist(entry: Omit<WatchlistEntry, "addedAt">)`,
  `removeFromWatchlist(id: number, mediaType: MediaType)`
- `continueWatching: ContinueWatchingEntry[]`, newest first,
  `recordWatch(entry: Omit<ContinueWatchingEntry, "lastWatchedAt">)`
  (upserts by id + mediaType, tv keeps latest season/episode),
  `removeFromContinueWatching(id: number, mediaType: MediaType)`
- `providers: StreamProvider[]`, pre-seeded with sixteen enabled entries
  (Vidzee, Peachify, Vidora, VidRift, YTHD, VidSrc, VidLink, VidSrc.net,
  2Embed, VidFast, then backups VidSrc.me, VidPrime, VixSrc, VidRock,
  MultiEmbed, 2Embed VCR), ordered by curl timing. See `DEFAULT_PROVIDERS` in
  `src/store/useAppStore.ts` for exact templates, which are the source of
  truth. New hosts flow into the native iframe allowlist automatically via
  `syncEmbedHosts` in `src/services/embedHosts.ts`, no other file changes.
  `addProvider(p: StreamProvider)`,
  `updateProvider(id: string, patch: Partial<StreamProvider>)`,
  `removeProvider(id: string)`,
  `toggleProviderEnabled(id: string)`,
  `moveProvider(id: string, direction: -1 | 1)`
- `activeProviderId: string` (defaults to first enabled),
  `setActiveProvider(id: string)`
- `cinemaDim: boolean` (not persisted), `toggleCinemaDim()`

  Videasy is dead (DNS) and must not be re-added. The sixteen verified
  providers above are the complete set (R-17 honesty decision, see
  DESIGN.md). Bump the store `version` whenever DEFAULT_PROVIDERS grows,
  so existing persisted records merge the new entries through `migrate`.
  Store version 5 also backfills `sandboxBypass: boolean` (default
  false) on every stored provider. `sandboxBypass` opts one source out
  of the theater iframe sandbox; WatchPage passes it to TheaterPlayer,
  the Sources edit form owns the toggle with warning copy, and the row
  shows an honest "no sandbox" chip while it is on.

### UI store (`src/store/useUIStore.ts`)

Not persisted. `commandOpen: boolean`, `sourcesOpen: boolean`,
`detail: { id: number; mediaType: MediaType } | null`,
`setCommandOpen(v: boolean)`, `setSourcesOpen(v: boolean)`,
`openDetail(item: { id: number; mediaType: MediaType }): void` (also closes
command palette if open), `closeDetail(): void`.

Sidebar and TopBar call `setCommandOpen(true)`, `setSourcesOpen(true)`,
`setActiveProvider(id)`; the Settings page owns appearance and data
sections, the Sources modal owns providers only, and nothing duplicates
the other's section.

### Appearance store (`src/store/useAppearanceStore.ts`)

Persisted, key `cryonex-appearance`, version 2. `glass: boolean`
(default false, elevated surfaces via `.glass-surface`), `setGlass`,
`toggleGlass`. `windowGlass: boolean` (default TRUE: the spatial
theater is built on native vibrancy; version 2 migrate flips stored
false to true once), `setWindowGlass`, `toggleWindowGlass`. When true,
App sets `data-window-glass="true"` on the html element and the
index.css token overrides turn the canvas translucent (alpha 0.6) over
the native macOS under-window blur. The window itself is transparent
with `underWindowBackground` effects chained in `src-tauri/src/lib.rs`.
`ambientBackdrop: AmbientPreset` (default "projector", owner-requested):
"off" | "projector" | "aurora" | "ember" | "spotlight" | "gradient" |
"custom", version 3 migrate maps the old boolean. Rendered by
`src/components/shell/AmbientBackdrop.tsx` (lg and up only, transform
keyframes in index.css, frozen by the global reduced-motion kill).
`ambientIntensity: number` (0 to 100, default 60) scales every preset
through a 0.5x to 1.8x multiplier. "custom" renders the JPEG data URL
stored under `cryonex-wallpaper` (Settings downscales to 1600px; the
backdrop listens for storage events). The Settings page owns the
picker, intensity slider and image upload; Sources modal never shows
appearance. `compatibilityMode: boolean` (default false): App.tsx
invokes the `set_adblock` Tauri command with `!compatibilityMode` on
every change, and WatchPage drops the theater sandbox entirely while
it is on. Honest copy in Settings names the tradeoff (ads possible).

### Button grammar

Follow DESIGN.md "Button grammar (Netflix-researched, adopted)": primary
h-11 px-7 rounded-lg bg-accent text-canvas font-bold with leading icon,
secondary bg-white/10 hover:bg-white/20, circle icon buttons size-10
rounded-full border-2 border-white/50. No shadows, no glow, no
gradients on buttons. Motion tiers in DESIGN.md "Motion, v2": micro
250ms, component 350-450ms, stage 550-750ms in and 250-350ms out,
ambient 800-1000ms, ease cubic-bezier(0.4, 0, 0.2, 1).

### Toast store (`src/store/useToastStore.ts`)

Not persisted. `pushToast({ title, tone?: "info" | "success" })`
auto-dismisses after 2.8 seconds; rendered once by
`src/components/shared/Toaster.tsx`, mounted in `src/App.tsx`.

### Search history store (`src/store/useSearchHistoryStore.ts`)

Persisted, key `cryonex-search-history`, max 8 entries.
`recent: string[]`, `addRecent(query)`, `removeRecent(query)`,
`clearRecent()`.

### Profiles (`src/store/useProfileStore.ts`)

Persisted, key `cryonex-profiles`. State: `profiles: Profile[]` where
`Profile = { id: string; name: string; color: ProfileColor }` (five tile
colors: crimson, blue, amber, emerald, violet; see `PROFILE_COLORS`),
`activeProfileId: string | null`, plus session-only `pickerOpen` and
`manageOpen` (excluded by `partialize`). First run seeds
`{ id: "hamza", name: "Hamza", color: "crimson" }` and marks it active.
At module load, legacy non-namespaced records `cryonex-store` and
`cryonex-search-history` are copied once to their `::hamza` variants so
existing watchlist and continue watching data survive as Hamza's (guard:
copy only when the namespaced key does not exist).

Actions: `addProfile(name, color)`, `renameProfile(id, name)`,
`setProfileColor(id, color)`, `deleteProfile(id)` (refuses the last
profile; deleting the active one activates the first remaining and
removes that profile's namespaced records),
`setActiveProfile(id)`, `setPickerOpen(v)`, `setManageOpen(v)`.

### Namespaced storage rule

Per-profile data lives at `{key}::{profileId}` in localStorage.
`src/services/profileStorage.ts` is the zustand `StateStorage` adapter
wired into `useAppStore` and `useSearchHistoryStore` via
`createJSONStorage`; it maps every key through the active profile id read
with `useProfileStore.getState()`, never hooks. No active profile yet:
the plain key is the fallback. Providers being per profile is accepted:
each fresh namespaced record seeds `DEFAULT_PROVIDERS` through the
existing merge-missing migrate. Profile switching happens only through
`switchProfile` and `rehydrateForActiveProfile` in
`src/services/profileStorage.ts`: a profile with no stored record
resets the app store to its initial state so no data bleeds between
profiles (zustand alone would keep the previous profile's data). The
import order in that file is load-order critical: profile store, app
store, search store.

### Who's watching gate

AppShell renders `WhoIsWatchingGate` when `pickerOpen`. The gate opens
on launch only when more than one profile exists; never for a single
profile. Picking a profile toasts `Watching as {name}`. The Sidebar
"Switch profile" button reopens it. `ManageProfilesModal` uses the
SourcesModal chassis (scrim, focus trap, canvas scroll lock) and allows
add, rename, color change and two-step delete only.

Honest scope cuts: avatars are colored tiles with the profile initial,
not character artwork; the tile carries light through
`profileTileBackground` (one hue, color-mix stops, inner shadow) and
live `readProfileStats` counts on the gate and manage surfaces; there
is no kids mode and no maturity filter in this app.

### Routes

- `/` Home (bento spotlight hero)
- `/new` New & Popular
- `/movies` Movies
- `/series` Series
- `/my-list` My List (`?sort=recent` = Recently Added view)
- `/continue` Continue Watching
- `/settings` Settings (appearance, sources entry, data, about)
- `/watch/movie/:id` movie theater
- `/watch/tv/:id?season=N&episode=M` episode theater

Navigate with `react-router-dom`. Never hardcode URLs outside these.

### Shared components

- `src/components/shared/MediaCard.tsx`: `MediaCard({ item: MediaItem })`,
  links to the watch route, poster aspect 2:3, hover lift with rating,
  year, play and watchlist affordances.
- `src/components/shared/MediaRow.tsx`: `MediaRow({ title: string, items:
  MediaItem[], loading?: boolean, error?: string | null, hideWhenEmpty?:
  boolean })`, horizontal scroller with visible scroll buttons, skeleton
  shimmer while loading, honest error text on failure.
- `src/components/shared/TmdbImage.tsx`: `TmdbImage({ path | src, size,
  alt, className, width, height, eager?, fetchPriority? })`. Every TMDB
  artwork goes through it: viewport observer instead of native
  `loading="lazy"` (WebKit leaves nested-scroller images blank), two
  retries with a cache-busting query, then hidden. Pass `width` and
  `height` so the observer can gate it; size-less logos load eagerly.
- `src/components/shared/TrailerModal.tsx`: `TrailerModal({ videoKey: string
  | null, title: string, onClose: () => void })`, YouTube embed, Escape
  closes, focus trapped on open.

### Mini-player dock rules (R-17 honesty)

The dock shows the newest `continueWatching` entry with resume controls
only. No progress bar, no timestamp: cross-origin embeds cannot report
playback time. Prev/next buttons disable honestly when the
details/episodes queries say no episode exists. The dock hides itself on
`/watch` routes and after dismiss, and returns on the next
`recordWatch`.

## Antislop gates (absolute)

- No em dash character in any user-facing string.
- Every interactive element does something real, or it does not ship.
- Every data surface has loading, empty, and error states that name the
  cause and the next action.
- All text contrast WCAG AA minimum.
- Full keyboard support, visible focus ring (already in `index.css`).
- Every `<img>` gets width/height or aspect-ratio. Artwork uses
  `TmdbImage`; native `loading="lazy"` is banned because WebKit leaves
  images inside nested scrollers blank.
  Hero backdrop is an `<img>` with `fetchpriority="high"`, never lazy.
- No fake data, no invented numbers, no decorative status dots. The
  emerald dot marks only real states (window glass, enabled server).
- Glass dose: the dock and the owner-toggle glass mode. Modals use
  `.material-modal`. Posters and artwork never glass.
- Glow: the ambient backdrop glow only. No glow on buttons, cards, badges.
- Pills are reserved for metadata chips and server chips. Everything else
  uses `--radius-ctl` or `--radius-card`.
- Motion has a written purpose, matches `DESIGN.md` dials, and stops under
  `prefers-reduced-motion` (already handled globally).
- Icons: sparse, content-relevant Lucide glyphs only (Play, Plus, Search,
  X, History, Clock, Server, Home, Flame, Monitor, Film, and genuine
  equivalents). Never use Sparkle, Star, Magic, Lightning, Robot, Zap as
  decoration.
- Comments: only a one-line why where code cannot say it. No narrating
  comments, no `// create a component that...` filler.
- Verify before reporting done: run `npx tsc -b`. Zero errors.
