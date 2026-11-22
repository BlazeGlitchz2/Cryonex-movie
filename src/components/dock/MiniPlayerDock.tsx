import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchMediaDetails,
  fetchSeasonEpisodes,
} from "../../services/tmdb";
import { useAppStore } from "../../store/useAppStore";
import { buildWatchPath } from "../shared/MediaCard";
import { standardQueryOptions } from "../shared/MediaRow";
import TmdbImage from "../shared/TmdbImage";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// dock transport keeps 44px touch targets below lg; desktop sizes unchanged
const CIRCLE_BTN =
  "grid size-10 max-lg:size-11 shrink-0 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink transition-colors duration-250 ease-in-out hover:border-white disabled:cursor-not-allowed disabled:border-white/20 disabled:opacity-40";

export function MiniPlayerDock() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entry = useAppStore((state) => state.continueWatching[0]);
  const lastWatchedAt = useAppStore(
    (state) => state.continueWatching[0]?.lastWatchedAt ?? 0,
  );
  const providers = useAppStore((state) => state.providers);
  const activeProviderId = useAppStore((state) => state.activeProviderId);
  const setActiveProvider = useAppStore((state) => state.setActiveProvider);

  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // dismissing remembers the watch stamp; the next recordWatch changes it and the dock returns
  const dismissed = dismissedAt === lastWatchedAt;

  const isTv = entry?.mediaType === "tv";
  const season = entry?.season ?? null;
  const episode = entry?.episode ?? null;

  const detailsQuery = useQuery({
    queryKey: ["details", "tv", entry?.id],
    queryFn: () => fetchMediaDetails("tv", entry!.id),
    enabled: isTv && entry !== undefined,
    ...standardQueryOptions,
  });
  const episodesQuery = useQuery({
    queryKey: ["episodes", entry?.id, season],
    queryFn: () => fetchSeasonEpisodes(entry!.id, season!),
    enabled: isTv && season !== null,
    ...standardQueryOptions,
  });
  // prev across a season boundary needs the previous season's episode count
  const prevSeasonQuery = useQuery({
    queryKey: ["episodes", entry?.id, season !== null ? season - 1 : null],
    queryFn: () => fetchSeasonEpisodes(entry!.id, season! - 1),
    enabled: isTv && season !== null && season > 1 && episode === 1,
    ...standardQueryOptions,
  });

  const episodes = episodesQuery.data;
  const nextTarget = (() => {
    if (!isTv || season === null || episode === null || !episodes) return null;
    const maxInSeason = Math.max(...episodes.map((e) => e.episodeNumber));
    if (episode < maxInSeason) return { season, episode: episode + 1 };
    const nextSeason = (detailsQuery.data?.seasons ?? [])
      .filter((s) => s.seasonNumber > season && s.episodeCount > 0)
      .sort((a, b) => a.seasonNumber - b.seasonNumber)[0];
    return nextSeason ? { season: nextSeason.seasonNumber, episode: 1 } : null;
  })();
  const prevTarget = (() => {
    if (!isTv || season === null || episode === null) return null;
    if (episode > 1) return { season, episode: episode - 1 };
    if (season > 1 && prevSeasonQuery.data && prevSeasonQuery.data.length > 0) {
      return {
        season: season - 1,
        episode: Math.max(...prevSeasonQuery.data.map((e) => e.episodeNumber)),
      };
    }
    return null;
  })();

  const enabledProviders = providers.filter((provider) => provider.enabled);
  const activeProvider =
    enabledProviders.find((provider) => provider.id === activeProviderId) ??
    enabledProviders[0];

  const cycleServer = () => {
    if (enabledProviders.length === 0) return;
    const index = enabledProviders.findIndex(
      (provider) => provider.id === activeProviderId,
    );
    const next = enabledProviders[(index + 1) % enabledProviders.length];
    setActiveProvider(next.id);
  };

  // the theater page is the full experience, the dock never floats over it
  const visible =
    entry !== undefined && !dismissed && !pathname.startsWith("/watch");

  const thumbClass =
    "size-11 shrink-0 rounded-xl border border-hairline object-cover";

  return (
    <AnimatePresence>
      {visible && entry && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{
            opacity: 1,
            y: 0,
            // stage-tier spring from DESIGN.md, settles in about 550ms
            transition: { type: "spring", stiffness: 180, damping: 24 },
          }}
          exit={{
            opacity: 0,
            y: 24,
            transition: { duration: 0.3, ease: EASE },
          }}
          className="material-dock fixed left-1/2 z-40 flex w-max -translate-x-1/2 items-center gap-3 rounded-hero px-5 py-2.5 shadow-2xl dock-bottom max-lg:gap-2 max-lg:px-3 max-lg:max-w-[calc(100vw-2rem)] max-lg:dock-bottom-raised lg:max-w-3xl"
        >
          {entry.backdropPath ? (
            <TmdbImage
              // tmdb.ts exposes no w300 size; w500 is the smallest allowed
              path={entry.backdropPath}
              size="w500"
              alt=""
              width={44}
              height={44}
              className={thumbClass}
            />
          ) : entry.posterPath ? (
            <TmdbImage
              key={entry.posterPath}
              path={entry.posterPath}
              size="w500"
              alt=""
              width={44}
              height={44}
              className={thumbClass}
            />
          ) : (
            <div
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-2 font-display text-sm font-bold text-ink-dim"
            >
              {entry.title.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {entry.title}
            </p>
            <p className="flex items-baseline gap-1.5 truncate text-xs text-ink-dim">
              <span>
                {isTv && season !== null && episode !== null
                  ? `S${season} E${episode}`
                  : "Movie"}
                {" · "}
                {activeProvider ? activeProvider.name : "No server"}
              </span>
              {activeProvider && (
                // emerald marks the real active server, not decoration
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 self-center rounded-full bg-emerald"
                />
              )}
            </p>
          </div>

          <div aria-hidden="true" className="h-8 w-px shrink-0 bg-white/[0.06] max-lg:hidden" />

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={() => setDismissedAt(lastWatchedAt)}
              aria-label="Hide mini player"
              className={`${CIRCLE_BTN} size-9 border`}
            >
              <X size={16} aria-hidden="true" />
            </motion.button>
            {isTv && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.25, ease: EASE }}
                disabled={!prevTarget}
                onClick={() =>
                  prevTarget &&
                  navigate(
                    buildWatchPath(
                      "tv",
                      entry.id,
                      prevTarget.season,
                      prevTarget.episode,
                    ),
                  )
                }
                aria-label={
                  prevTarget
                    ? `Play previous episode of ${entry.title}`
                    : `No previous episode of ${entry.title}`
                }
                className={CIRCLE_BTN}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={() =>
                navigate(
                  buildWatchPath(
                    entry.mediaType,
                    entry.id,
                    entry.season,
                    entry.episode,
                  ),
                )
              }
              aria-label={`Continue ${entry.title}`}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-canvas shadow-xl transition-colors duration-250 ease-in-out hover:bg-white/80"
            >
              <Play size={20} aria-hidden="true" className="fill-current" />
            </motion.button>
            {isTv && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.25, ease: EASE }}
                disabled={!nextTarget}
                onClick={() =>
                  nextTarget &&
                  navigate(
                    buildWatchPath(
                      "tv",
                      entry.id,
                      nextTarget.season,
                      nextTarget.episode,
                    ),
                  )
                }
                aria-label={
                  nextTarget
                    ? `Play next episode of ${entry.title}`
                    : `No next episode of ${entry.title}`
                }
                className={CIRCLE_BTN}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.25, ease: EASE }}
              disabled={enabledProviders.length === 0}
              onClick={cycleServer}
              aria-label={
                enabledProviders.length > 1
                  ? `Switch server from ${activeProvider?.name ?? "none"}`
                  : "Switch server"
              }
              className={`${CIRCLE_BTN} size-9 border`}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </motion.button>
          </div>

          <div
            aria-hidden="true"
            className="h-8 w-px shrink-0 bg-white/[0.06] max-lg:hidden"
          />

          {/* duplicates the resume play navigation, hidden where width is tightest */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() =>
              navigate(
                buildWatchPath(
                  entry.mediaType,
                  entry.id,
                  entry.season,
                  entry.episode,
                ),
              )
            }
            aria-label={`Open ${entry.title} in theater`}
            className={`${CIRCLE_BTN} size-9 max-[419px]:hidden border`}
          >
            <Maximize2 size={16} aria-hidden="true" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MiniPlayerDock;
