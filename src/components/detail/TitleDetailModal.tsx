import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { FastAverageColor } from "fast-average-color";
import {
  Check,
  ChevronDown,
  Play,
  Plus,
  RotateCcw,
  Server,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchMediaDetails,
  fetchSeasonEpisodes,
  tmdbImageUrl,
} from "../../services/tmdb";
import { useAppStore } from "../../store/useAppStore";
import { useUIStore } from "../../store/useUIStore";
import type {
  Episode,
  MediaDetails,
  MediaItem,
  MediaType,
  Season,
  StreamProvider,
  Video,
} from "../../types/media";
import { buildWatchPath } from "../shared/MediaCard";
import {
  queryErrorMessage,
  standardQueryOptions,
} from "../shared/MediaRow";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const TRAILER_DELAY_MS = 1200;
const FLOATING_CONTROL =
  "grid size-10 shrink-0 place-items-center rounded-full border-2 border-white/50 bg-black/60 text-ink backdrop-blur-md transition-colors duration-250 ease-in-out hover:border-white hover:bg-black/80 max-lg:size-11";

const fac = new FastAverageColor();

const sectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const sectionRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

interface DetailTarget {
  id: number;
  mediaType: MediaType;
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function pickTrailer(videos: Video[]): string | null {
  const youtube = videos.filter((video) => video.site === "YouTube");
  return (
    youtube.find((video) => video.type === "Trailer" && video.official)?.key ??
    youtube.find((video) => video.type === "Trailer")?.key ??
    null
  );
}

function useAmbientColor(imageUrl: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);
  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    fac
      .getColorAsync(imageUrl, { crossOrigin: "anonymous" })
      .then((result) => {
        if (!cancelled) setColor(result.rgb);
      })
      .catch(() => {
        // ambient tint is decorative, so a blocked CORS sample is skipped silently
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return color;
}

function ServerPill({
  providers,
  activeProviderId,
  menuOpen,
  onMenuOpenChange,
  onSelect,
}: {
  providers: StreamProvider[];
  activeProviderId: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const enabled = providers.filter((provider) => provider.enabled);
  const active = enabled.find((provider) => provider.id === activeProviderId);

  const closeMenu = (focusTrigger: boolean) => {
    onMenuOpenChange(false);
    if (focusTrigger) {
      triggerRef.current?.focus();
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Server: ${active ? active.name : "No server"}`}
        onClick={() => onMenuOpenChange(!menuOpen)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 py-2 pl-3 pr-3.5 text-xs font-semibold text-ink backdrop-blur-md transition-colors duration-250 ease-in-out hover:border-white/30"
      >
        <Server size={14} aria-hidden="true" />
        {active ? active.name : "No server"}
        {active?.badge && (
          <span className="font-medium text-ink-dim">{active.badge}</span>
        )}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-ink-dim transition-transform duration-250 ease-in-out ${
            menuOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* catcher closes the menu on any outside click without hitting the scrim */}
            <div
              aria-hidden="true"
              className="fixed inset-0 z-20"
              onClick={() => closeMenu(false)}
            />
            <motion.div
              role="menu"
              aria-label="Choose server"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="material-modal absolute bottom-full left-0 z-30 mb-2 w-56 rounded-hero p-1.5 shadow-2xl"
            >
              {enabled.length === 0 ? (
                <p className="px-3 py-2 text-xs leading-relaxed text-ink-dim">
                  No servers enabled. Turn one on in Streaming sources.
                </p>
              ) : (
                enabled.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(provider.id);
                      closeMenu(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-xs text-ink transition-colors duration-250 ease-in-out hover:bg-white/10"
                  >
                    {provider.id === activeProviderId && (
                      // emerald marks the real active server, not decoration
                      <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-full bg-emerald"
                      />
                    )}
                    <span className="flex-1 truncate font-semibold">
                      {provider.name}
                    </span>
                    {provider.badge && (
                      <span className="shrink-0 text-ink-dim">
                        {provider.badge}
                      </span>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EpisodeRow({
  episode,
  onPlay,
}: {
  episode: Episode;
  onPlay: (episodeNumber: number) => void;
}) {
  const metaParts = [
    episode.runtime !== null ? `${episode.runtime} min` : null,
    episode.airDate ? episode.airDate.slice(0, 4) : null,
  ].filter((part): part is string => part !== null);
  return (
    <motion.button
      type="button"
      onClick={() => onPlay(episode.episodeNumber)}
      aria-label={`Play ${episode.name || `episode ${episode.episodeNumber}`}`}
      whileHover={{ y: -3, transition: { duration: 0.35, ease: EASE } }}
      className="material-card group flex w-full gap-3 rounded-card p-2.5 text-left transition-colors duration-250 ease-in-out hover:border-white/15"
    >
      <div className="relative aspect-video w-[140px] shrink-0 overflow-hidden rounded-ctl bg-surface-2">
        {episode.stillPath ? (
          <img
            // tmdb.ts exposes no w300 size; w500 is the smallest allowed.
            src={tmdbImageUrl(episode.stillPath, "w500")}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="shimmer h-full w-full" aria-hidden="true" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity duration-250 ease-in-out group-hover:opacity-100"
        >
          <span className="grid size-9 place-items-center rounded-full bg-white text-black">
            <Play size={16} className="fill-current" />
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold text-ink">
            {episode.episodeNumber}
          </span>
          <span className="truncate text-sm text-ink">
            {episode.name || `Episode ${episode.episodeNumber}`}
          </span>
        </div>
        {metaParts.length > 0 && (
          <p className="mt-1 text-xs text-ink-dim">{metaParts.join(" · ")}</p>
        )}
        {episode.overview && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-dim">
            {episode.overview}
          </p>
        )}
      </div>
    </motion.button>
  );
}

function EpisodesSection({
  tvId,
  seasons,
  onPlay,
}: {
  tvId: number;
  seasons: Season[];
  onPlay: (season: number, episode: number) => void;
}) {
  const seasonSelectId = useId();
  const [selectedSeason, setSelectedSeason] = useState(
    seasons[0]?.seasonNumber ?? 1,
  );

  const episodesQuery = useQuery({
    queryKey: ["episodes", tvId, selectedSeason],
    queryFn: () => fetchSeasonEpisodes(tvId, selectedSeason),
    ...standardQueryOptions,
  });
  const episodes = episodesQuery.data;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">
          Episodes
        </h3>
        <div className="relative">
          <select
            id={seasonSelectId}
            aria-label="Season"
            value={selectedSeason}
            onChange={(event) =>
              setSelectedSeason(Number(event.target.value))
            }
            className="appearance-none rounded-ctl border border-hairline bg-surface py-1.5 pl-3 pr-8 text-sm text-ink transition-colors duration-250 ease-in-out hover:bg-surface-2 max-lg:min-h-11 max-lg:text-base"
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.seasonNumber}>
                {season.name || `Season ${season.seasonNumber}`}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-dim"
          />
        </div>
      </div>

      {episodesQuery.isPending && (
        <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="material-card flex gap-3 rounded-card p-2.5"
            >
              <div className="shimmer aspect-video w-[140px] shrink-0 rounded-ctl" />
              <div className="flex-1 space-y-2 py-1">
                <div className="shimmer h-3.5 w-3/4 rounded-ctl" />
                <div className="shimmer h-3 w-1/3 rounded-ctl" />
                <div className="shimmer h-3 w-2/3 rounded-ctl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {episodesQuery.isError && (
        <div className="material-card mt-4 rounded-card p-4">
          <p className="text-sm text-ink">
            Episodes could not be loaded. {episodesQuery.error.message}
          </p>
          <button
            type="button"
            onClick={() => episodesQuery.refetch()}
            className="mt-3 rounded-ctl bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-colors duration-250 ease-in-out hover:bg-white/80"
          >
            Try again
          </button>
        </div>
      )}

      {episodes && episodes.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">
          TMDB lists no episodes for this season yet.
        </p>
      )}

      {episodes && episodes.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              onPlay={(episodeNumber) => onPlay(selectedSeason, episodeNumber)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SimilarCard({
  tile,
  onOpen,
}: {
  tile: MediaItem;
  onOpen: (item: MediaItem) => void;
}) {
  const inWatchlist = useAppStore((state) =>
    state.isInWatchlist(tile.id, tile.mediaType),
  );
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist);

  return (
    <div className="material-card group relative overflow-hidden rounded-card text-left transition-colors duration-250 ease-in-out hover:border-white/15">
      <button
        type="button"
        onClick={() => onOpen(tile)}
        aria-label={`Open details for ${tile.title}`}
        className="block w-full"
      >
        {tile.backdropPath ? (
          <img
            src={tmdbImageUrl(tile.backdropPath, "w780")}
            alt=""
            loading="lazy"
            width={780}
            height={439}
            className="aspect-video w-full bg-surface-2 object-cover transition-transform duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-surface-2 p-3 text-center">
            <span className="font-display text-xs leading-snug text-ink-dim">
              {tile.title}
            </span>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink">
              {tile.title}
            </p>
            {tile.releaseYear !== null && (
              <span className="shrink-0 text-xs text-ink-dim">
                {tile.releaseYear}
              </span>
            )}
          </div>
          {tile.overview && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-dim">
              {tile.overview}
            </p>
          )}
        </div>
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94, transition: { duration: 0.25, ease: EASE } }}
        onClick={() =>
          toggleWatchlist({
            id: tile.id,
            mediaType: tile.mediaType,
            title: tile.title,
            overview: tile.overview,
            posterPath: tile.posterPath,
            backdropPath: tile.backdropPath,
            voteAverage: tile.voteAverage,
            releaseYear: tile.releaseYear,
          })
        }
        aria-pressed={inWatchlist}
        aria-label={
          inWatchlist
            ? `Remove ${tile.title} from watchlist`
            : `Add ${tile.title} to watchlist`
        }
        // touch has no hover, so the affordance stays visible below lg
        className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-full border-2 border-white/50 bg-black/60 text-ink opacity-0 backdrop-blur-md transition-[opacity,border-color] duration-250 ease-in-out hover:border-white group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
      >
        {inWatchlist ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Plus size={18} aria-hidden="true" />
        )}
      </motion.button>
    </div>
  );
}

function SimilarGrid({
  items,
  onOpen,
}: {
  items: MediaItem[];
  onOpen: (item: MediaItem) => void;
}) {
  // 12 tiles keeps the modal scroll finite; TMDB returns up to 20
  const tiles = items.slice(0, 12);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {tiles.map((tile) => (
        <SimilarCard
          key={`${tile.mediaType}-${tile.id}`}
          tile={tile}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function DetailFacts({ details }: { details: MediaDetails }) {
  return (
    <aside className="space-y-2.5 text-xs leading-relaxed">
      {details.cast.length > 0 && (
        <p>
          <span className="text-ink-dim">Cast: </span>
          <span className="text-ink">
            {details.cast
              .slice(0, 5)
              .map((member) => member.name)
              .join(", ")}
          </span>
        </p>
      )}
      {details.genres.length > 0 && (
        <p>
          <span className="text-ink-dim">Genres: </span>
          <span className="text-ink">
            {details.genres.map((genre) => genre.name).join(", ")}
          </span>
        </p>
      )}
      {details.status && (
        <p>
          <span className="text-ink-dim">Status: </span>
          <span className="text-ink">{details.status}</span>
        </p>
      )}
    </aside>
  );
}

function DetailBodySkeleton() {
  return (
    <div
      className="grid max-lg:grid-cols-1 max-lg:gap-6 lg:grid-cols-12 lg:gap-8"
      aria-hidden="true"
    >
      <div className="space-y-4 lg:col-span-8">
        <div className="flex gap-2">
          <div className="shimmer h-6 w-16 rounded-full" />
          <div className="shimmer h-6 w-14 rounded-full" />
          <div className="shimmer h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="shimmer h-4 w-full rounded-ctl" />
          <div className="shimmer h-4 w-11/12 rounded-ctl" />
          <div className="shimmer h-4 w-2/3 rounded-ctl" />
        </div>
      </div>
      <div className="col-span-4 space-y-2.5 max-lg:col-span-1 lg:col-span-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shimmer h-3.5 w-full rounded-ctl" />
        ))}
      </div>
    </div>
  );
}

function DetailBody({
  details,
  onPlayEpisode,
  onOpenSimilar,
}: {
  details: MediaDetails;
  onPlayEpisode: (season: number, episode: number) => void;
  onOpenSimilar: (item: MediaItem) => void;
}) {
  return (
    <motion.div
      variants={sectionStagger}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="grid max-lg:grid-cols-1 max-lg:gap-6 lg:grid-cols-12 lg:gap-8">
        <motion.div
          variants={sectionRise}
          className="col-span-8 space-y-4 max-lg:col-span-1 lg:col-span-8"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-1.5 rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs">
              <Star
                size={12}
                aria-hidden="true"
                className="fill-current text-emerald"
              />
              {/* emerald reserved for the real TMDB score */}
              <span className="font-semibold text-emerald">
                {details.voteAverage.toFixed(1)}
              </span>
            </span>
            {details.releaseYear !== null && (
              <span className="rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs text-ink">
                {details.releaseYear}
              </span>
            )}
            {details.mediaType === "movie" && details.runtime !== null && (
              <span className="rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs text-ink">
                {formatRuntime(details.runtime)}
              </span>
            )}
            {details.mediaType === "tv" && details.numberOfSeasons > 0 && (
              <span className="rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs text-ink">
                {details.numberOfSeasons}{" "}
                {details.numberOfSeasons === 1 ? "season" : "seasons"}
              </span>
            )}
            {details.genres.length > 0 && (
              <span className="text-xs text-ink-dim">
                {details.genres.map((genre) => genre.name).join(" · ")}
              </span>
            )}
          </div>
          {details.overview && (
            <p className="text-sm leading-relaxed text-white/85">
              {details.overview}
            </p>
          )}
        </motion.div>
        <motion.div
          variants={sectionRise}
          className="col-span-4 max-lg:col-span-1 lg:col-span-4"
        >
          <DetailFacts details={details} />
        </motion.div>
      </div>

      {details.mediaType === "tv" && details.seasons.length > 0 && (
        <motion.section variants={sectionRise}>
          <EpisodesSection
            tvId={details.id}
            seasons={details.seasons}
            onPlay={onPlayEpisode}
          />
        </motion.section>
      )}

      {details.similar.length > 0 && (
        <motion.section variants={sectionRise}>
          <h3 className="font-display text-base font-semibold text-ink">
            More like this
          </h3>
          <div className="mt-3">
            <SimilarGrid items={details.similar} onOpen={onOpenSimilar} />
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}

function DetailOverlay({
  item,
  onClose,
}: {
  item: DetailTarget;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const openDetail = useUIStore((state) => state.openDetail);
  const itemKey = `${item.mediaType}-${item.id}`;

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const detailsQuery = useQuery({
    queryKey: ["details", item.mediaType, item.id],
    queryFn: () => fetchMediaDetails(item.mediaType, item.id),
    ...standardQueryOptions,
  });
  const details: MediaDetails | null = detailsQuery.data ?? null;

  const inWatchlist = useAppStore((state) =>
    state.isInWatchlist(item.id, item.mediaType),
  );
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist);
  const providers = useAppStore((state) => state.providers);
  const activeProviderId = useAppStore((state) => state.activeProviderId);
  const setActiveProvider = useAppStore((state) => state.setActiveProvider);

  const backdropUrl = details?.backdropPath
    ? tmdbImageUrl(details.backdropPath, "w1280")
    : null;
  // the previous tint stays until the new backdrop is sampled, so swaps never flash empty
  const ambientColor = useAmbientColor(backdropUrl);

  const trailerKey = details ? pickTrailer(details.videos) : null;
  const [trailerLive, setTrailerLive] = useState(false);
  const [muted, setMuted] = useState(true);
  // key bump remounts the iframe, the only reliable way to restart an embed
  const [trailerFrameKey, setTrailerFrameKey] = useState(0);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);

  useEffect(() => {
    // each title gets its own delayed trailer takeover, muted from scratch
    setTrailerLive(false);
    setMuted(true);
    setServerMenuOpen(false);
    if (!trailerKey) return;
    const timer = window.setTimeout(
      () => setTrailerLive(true),
      TRAILER_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [trailerKey, item.id, item.mediaType]);

  const trailerSrc = trailerKey
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=${
        muted ? "1" : "0"
      }&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0`
    : null;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // the shell owns scrolling, so lock the canvas scroller, not the body
    const canvas = document.getElementById("canvas-scroll");
    const previousOverflow = canvas?.style.overflow ?? "";
    if (canvas) {
      canvas.style.overflow = "hidden";
    }
    return () => {
      if (canvas) {
        canvas.style.overflow = previousOverflow;
      }
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      // the open server menu owns the first Escape, the modal the second
      if (serverMenuOpen) {
        setServerMenuOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, serverMenuOpen]);

  useEffect(() => {
    // in-place swaps unmount the control that had focus, so park it on the persistent close button
    closeRef.current?.focus();
  }, [item.id, item.mediaType]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    const focusables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        "button, input, select, [href]",
      ) ?? [],
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) {
      return;
    }
    const current = focusables.indexOf(
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : focusables[0],
    );
    const next = event.shiftKey
      ? current <= 0
        ? focusables.length - 1
        : current - 1
      : current === -1 || current === focusables.length - 1
        ? 0
        : current + 1;
    focusables[next]?.focus();
  };

  const playNow = useCallback(() => {
    onClose();
    navigate(
      item.mediaType === "movie"
        ? `/watch/movie/${item.id}`
        : `/watch/tv/${item.id}`,
    );
  }, [item.id, item.mediaType, navigate, onClose]);

  const playEpisode = useCallback(
    (season: number, episode: number) => {
      onClose();
      navigate(buildWatchPath("tv", item.id, season, episode));
    },
    [item.id, navigate, onClose],
  );

  const openSimilar = useCallback(
    (tile: MediaItem) => {
      openDetail({ id: tile.id, mediaType: tile.mediaType });
    },
    [openDetail],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative mx-auto my-[4vh] w-full max-w-4xl px-4 max-lg:px-2">
        <AnimatePresence initial={false}>
          {ambientColor && (
            <motion.div
              key={itemKey}
              aria-hidden="true"
              // blur is halved below lg like the materials, it is the top mobile GPU cost
              className="pointer-events-none absolute inset-x-[-8%] top-[-6vh] h-[60vh] blur-[130px] max-lg:blur-[72px]"
              style={{
                background: `radial-gradient(ellipse 50% 45% at 50% 45%, ${ambientColor}, transparent)`,
              }}
              initial={{ opacity: 0 }}
              // the live trailer owns the color, so the still-artwork spill dims slightly
              animate={{ opacity: trailerLive ? 0.12 : 0.16 }}
              exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
              transition={{ duration: 0.9, ease: EASE }}
            />
          )}
        </AnimatePresence>

        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={details ? details.title : "Title details"}
          className="material-modal relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[24px] shadow-2xl max-lg:max-h-[92dvh]"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            // 2% overshoot on settle, one gentle keyframe pass, no bounce
            scale: [0.96, 1.008, 1],
            transition: { duration: 0.55, ease: EASE, times: [0, 0.7, 1] },
          }}
          exit={{
            opacity: 0,
            y: 24,
            scale: 0.96,
            transition: { duration: 0.3, ease: EASE },
          }}
          onKeyDown={onPanelKeyDown}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`${FLOATING_CONTROL} absolute right-4 top-4 z-30`}
          >
            <X size={20} aria-hidden="true" />
          </button>

          <div className="relative aspect-video max-h-[440px] min-h-[240px] shrink-0 overflow-hidden">
            <motion.div
              layout
              layoutId={`title-${item.mediaType}-${item.id}`}
              transition={{ duration: 0.65, ease: EASE }}
              className={`absolute inset-0 ${
                detailsQuery.isPending ? "shimmer" : "bg-surface-2"
              }`}
            >
              <AnimatePresence initial={false}>
                {backdropUrl && (
                  <motion.div
                    key={itemKey}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <img
                      src={backdropUrl}
                      alt=""
                      width={1280}
                      height={720}
                      fetchPriority="high"
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {trailerLive && trailerSrc && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 bg-surface-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                  >
                    {/* scale crops the YouTube letterbox chrome away at the edges */}
                    <iframe
                      key={trailerFrameKey}
                      src={trailerSrc}
                      title="Trailer"
                      allow="autoplay; encrypted-media"
                      className="h-full w-full scale-[1.15]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_top,#141413_4%,rgba(20,20,19,0.6)_35%,transparent_100%)]"
            />

            <AnimatePresence initial={false}>
              <motion.div
                key={itemKey}
                className="absolute inset-0 z-10"
                exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
              >
                {detailsQuery.isPending ? (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 max-lg:p-4">
                    <div
                      className="shimmer h-10 w-56 rounded-ctl"
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-3">
                      <div
                        className="shimmer h-10 w-32 rounded-xl"
                        aria-hidden="true"
                      />
                      <div
                        className="shimmer h-10 w-36 rounded-full"
                        aria-hidden="true"
                      />
                      <div
                        className="shimmer size-10 rounded-full"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                ) : details ? (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 max-lg:p-4">
                    <motion.div
                      className="flex min-h-14 items-end"
                      initial={{
                        clipPath: "inset(0 100% 0 0)",
                        filter: "blur(8px)",
                      }}
                      animate={{
                        clipPath: "inset(0 0% 0 0)",
                        filter: "blur(0px)",
                      }}
                      transition={{ duration: 0.7, ease: EASE }}
                    >
                      {details.titleLogos[0] ? (
                        <img
                          src={tmdbImageUrl(
                            details.titleLogos[0].filePath,
                            "w500",
                          )}
                          alt={details.title}
                          className="max-h-14 max-w-[300px] w-auto object-contain drop-shadow-[0_4px_24px_rgba(7,8,10,0.7)]"
                        />
                      ) : (
                        <h2 className="max-w-[300px] font-display text-3xl font-extrabold leading-tight text-ink drop-shadow-[0_4px_24px_rgba(7,8,10,0.7)] max-lg:text-2xl">
                          {details.title}
                        </h2>
                      )}
                    </motion.div>
                    <div className="flex flex-wrap items-center gap-3">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        onClick={playNow}
                        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-base font-bold text-black transition-colors duration-250 ease-in-out hover:bg-white/80 max-lg:min-h-11"
                      >
                        <Play size={18} aria-hidden="true" />
                        Play
                      </motion.button>
                      <ServerPill
                        providers={providers}
                        activeProviderId={activeProviderId}
                        menuOpen={serverMenuOpen}
                        onMenuOpenChange={setServerMenuOpen}
                        onSelect={setActiveProvider}
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        onClick={() =>
                          toggleWatchlist({
                            id: details.id,
                            mediaType: details.mediaType,
                            title: details.title,
                            overview: details.overview,
                            posterPath: details.posterPath,
                            backdropPath: details.backdropPath,
                            voteAverage: details.voteAverage,
                            releaseYear: details.releaseYear,
                          })
                        }
                        aria-pressed={inWatchlist}
                        aria-label={
                          inWatchlist
                            ? `Remove ${details.title} from watchlist`
                            : `Add ${details.title} to watchlist`
                        }
                        className="grid size-10 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink transition-colors duration-250 ease-in-out hover:border-white max-lg:size-11"
                      >
                        {inWatchlist ? (
                          <Check size={20} aria-hidden="true" />
                        ) : (
                          <Plus size={20} aria-hidden="true" />
                        )}
                      </motion.button>
                      {trailerKey && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          onClick={() => {
                            setTrailerLive(true);
                            setTrailerFrameKey((key) => key + 1);
                          }}
                          aria-label="Replay trailer"
                          className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-md transition-colors duration-250 ease-in-out hover:border-white/30 hover:bg-black/80 max-lg:min-h-11"
                        >
                          <RotateCcw size={16} aria-hidden="true" />
                          Replay trailer
                        </motion.button>
                      )}
                    </div>
                  </div>
                ) : null}
                {trailerLive && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    onClick={() => setMuted((value) => !value)}
                    aria-pressed={!muted}
                    aria-label={muted ? "Unmute trailer" : "Mute trailer"}
                    className={`${FLOATING_CONTROL} absolute bottom-6 right-6 z-20`}
                  >
                    {muted ? (
                      <VolumeX size={18} aria-hidden="true" />
                    ) : (
                      <Volume2 size={18} aria-hidden="true" />
                    )}
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={itemKey}
                className="px-8 py-5 max-lg:px-4 max-lg:py-4"
                exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
              >
                {detailsQuery.isPending && <DetailBodySkeleton />}
                {detailsQuery.isError && (
                  <div className="max-w-2xl">
                    <p className="text-sm text-ink">
                      Could not load this title.{" "}
                      {queryErrorMessage(detailsQuery.error) ??
                        "Unknown error."}{" "}
                      <button
                        type="button"
                        onClick={() => detailsQuery.refetch()}
                        className="font-semibold text-ink underline underline-offset-2 transition-colors duration-250 ease-in-out hover:text-white"
                      >
                        Try again
                      </button>
                    </p>
                  </div>
                )}
                {details && (
                  <DetailBody
                    details={details}
                    onPlayEpisode={playEpisode}
                    onOpenSimilar={openSimilar}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function TitleDetailModal() {
  const detail = useUIStore((state) => state.detail);
  const closeDetail = useUIStore((state) => state.closeDetail);

  return (
    <AnimatePresence>
      {detail !== null && (
        <DetailOverlay
          key="title-detail-overlay"
          item={detail}
          onClose={closeDetail}
        />
      )}
    </AnimatePresence>
  );
}
