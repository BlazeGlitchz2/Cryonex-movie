import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { SkipForward } from "lucide-react";
import { fetchMediaDetails, fetchSeasonEpisodes, tmdbImageUrl } from "../services/tmdb";
import { buildProviderUrl } from "../types/media";
import type { MediaType } from "../types/media";
import { useAppStore } from "../store/useAppStore";
import { useUIStore } from "../store/useUIStore";
import MediaRow from "../components/shared/MediaRow";
import ServerBar from "../components/watch/ServerBar";
import TheaterPlayer from "../components/watch/TheaterPlayer";
import EpisodeList from "../components/watch/EpisodeList";
import CastScroller from "../components/watch/CastScroller";
import { useAverageColor } from "../components/watch/useAverageColor";

const QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

type TabKey = "episodes" | "cast" | "similar";

const TAB_LABELS: Record<TabKey, string> = {
  episodes: "Episodes",
  cast: "Cast",
  similar: "Similar",
};

export default function WatchPage() {
  const params = useParams<{ id?: string; mediaType?: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabIdBase = useId();

  const mediaType: MediaType =
    params.mediaType === "movie" || params.mediaType === "tv"
      ? params.mediaType
      : location.pathname.startsWith("/watch/movie")
        ? "movie"
        : "tv";
  const id = Number(params.id);

  const continueWatching = useAppStore((state) => state.continueWatching);
  const recordWatch = useAppStore((state) => state.recordWatch);
  const providers = useAppStore((state) => state.providers);
  const activeProviderId = useAppStore((state) => state.activeProviderId);
  const setActiveProvider = useAppStore((state) => state.setActiveProvider);
  const cinemaDim = useAppStore((state) => state.cinemaDim);
  const toggleCinemaDim = useAppStore((state) => state.toggleCinemaDim);
  const setSourcesOpen = useUIStore((state) => state.setSourcesOpen);

  const resumeEntry = useMemo(
    () =>
      continueWatching.find(
        (entry) => entry.id === id && entry.mediaType === mediaType,
      ),
    [continueWatching, id, mediaType],
  );

  const rawSeason = searchParams.get("season");
  const rawEpisode = searchParams.get("episode");
  const season =
    rawSeason !== null && Number.isFinite(Number(rawSeason))
      ? Math.max(0, Number(rawSeason))
      : (resumeEntry?.season ?? 1);
  const episode =
    rawEpisode !== null && Number.isFinite(Number(rawEpisode))
      ? Math.max(1, Number(rawEpisode))
      : (resumeEntry?.episode ?? 1);

  const validId = Number.isFinite(id) && id > 0;

  const detailsQuery = useQuery({
    queryKey: ["details", mediaType, id],
    queryFn: () => fetchMediaDetails(mediaType, id),
    enabled: validId,
    ...QUERY_OPTIONS,
  });
  const details = detailsQuery.data;

  const episodesQuery = useQuery({
    queryKey: ["episodes", id, season],
    queryFn: () => fetchSeasonEpisodes(id, season),
    enabled: validId && mediaType === "tv",
    ...QUERY_OPTIONS,
  });

  useEffect(() => {
    if (!details) {
      return;
    }
    recordWatch({
      id,
      mediaType,
      title: details.title,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      season: mediaType === "tv" ? season : null,
      episode: mediaType === "tv" ? episode : null,
    });
  }, [details, id, mediaType, season, episode, recordWatch]);

  const enabledProviders = providers.filter((provider) => provider.enabled);
  const activeProvider =
    enabledProviders.find((provider) => provider.id === activeProviderId) ??
    enabledProviders[0];

  const playerSrc = activeProvider
    ? buildProviderUrl(activeProvider, mediaType, id, season, episode)
    : "";

  const ambientSource = details?.backdropPath ?? details?.posterPath ?? null;
  const ambientColor = useAverageColor(
    ambientSource ? tmdbImageUrl(ambientSource, "w500") : null,
  );

  const nextTarget = useMemo(() => {
    if (mediaType !== "tv" || !details || !episodesQuery.data) {
      return null;
    }
    if (episodesQuery.data.some((item) => item.episodeNumber === episode + 1)) {
      return { season, episode: episode + 1 };
    }
    const nextSeason = details.seasons.find(
      (item) => item.seasonNumber === season + 1 && item.episodeCount > 0,
    );
    return nextSeason
      ? { season: nextSeason.seasonNumber, episode: 1 }
      : null;
  }, [mediaType, details, episodesQuery.data, season, episode]);

  const navigateEpisode = (nextSeason: number, nextEpisode: number) => {
    setSearchParams({
      season: String(nextSeason),
      episode: String(nextEpisode),
    });
    document.getElementById("canvas-scroll")?.scrollTo({ top: 0 });
  };

  const tabs: TabKey[] =
    mediaType === "tv" ? ["episodes", "cast", "similar"] : ["cast", "similar"];
  const [activeTab, setActiveTab] = useState<TabKey>(
    mediaType === "tv" ? "episodes" : "cast",
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[next]);
    tabRefs.current[next]?.focus();
  };

  if (!validId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-display text-xl font-bold text-ink">
          This watch link is broken.
        </p>
        <p className="text-sm text-ink-dim">
          The URL has no valid title id, so there is nothing to play.
        </p>
        <Link
          to="/"
          className="mt-2 rounded-ctl bg-accent px-4 py-2 text-sm font-semibold text-canvas"
        >
          Go home
        </Link>
      </div>
    );
  }

  const metaParts = [
    details?.releaseYear ? String(details.releaseYear) : null,
    mediaType === "movie"
      ? (details?.runtime ? `${details.runtime} min` : null)
      : (details && details.numberOfSeasons > 0
          ? `${details.numberOfSeasons} season${details.numberOfSeasons === 1 ? "" : "s"}`
          : null),
    details ? details.genres.slice(0, 3).map((genre) => genre.name).join(", ") || null : null,
  ].filter((part): part is string => part !== null);

  const frameTitle = `Watching ${details?.title || "this title"}`;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl px-8 pb-16 max-lg:px-4"
    >
      <motion.div variants={rise}>
        <ServerBar
          title={details?.title || null}
          episodeLabel={mediaType === "tv" ? `S${season} E${episode}` : null}
          providers={enabledProviders}
          activeId={activeProvider?.id ?? ""}
          onSelect={setActiveProvider}
          cinemaDim={cinemaDim}
          onToggleCinemaDim={toggleCinemaDim}
          extra={
            nextTarget ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95, transition: { duration: 0.25, ease: EASE } }}
                onClick={() =>
                  navigateEpisode(nextTarget.season, nextTarget.episode)
                }
                className="flex h-11 items-center gap-2 rounded-lg bg-white/10 px-6 text-sm font-bold text-ink transition-colors duration-[250ms] ease-in-out hover:bg-white/20"
              >
                <SkipForward size={18} aria-hidden="true" />
                Next episode
              </motion.button>
            ) : null
          }
        />
      </motion.div>

      <motion.div variants={rise} className="mt-3">
        {activeProvider ? (
          <TheaterPlayer
            src={playerSrc}
            frameTitle={frameTitle}
            ambientColor={ambientColor}
            dimmed={cinemaDim}
          />
        ) : (
          <div className="material-card flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-hero text-center">
            <p className="font-display text-lg font-bold text-ink">
              No streaming source is enabled.
            </p>
            <p className="text-sm text-ink-dim">
              Enable a provider in Sources to start watching.
            </p>
            <button
              type="button"
              onClick={() => setSourcesOpen(true)}
              className="mt-1 rounded-ctl bg-accent px-4 py-2 text-sm font-semibold text-canvas"
            >
              Open sources
            </button>
          </div>
        )}
      </motion.div>

      <motion.div variants={rise}>
          <motion.div
            animate={{ opacity: cinemaDim ? 0.25 : 1 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="mt-8"
          >
        {detailsQuery.isPending && (
          <div className="space-y-4" aria-hidden="true">
            <div className="shimmer h-8 w-64 rounded-ctl" />
            <div className="shimmer h-4 w-80 rounded-ctl" />
            <div className="shimmer h-40 rounded-card" />
          </div>
        )}

        {detailsQuery.isError && (
          <div className="rounded-card border border-hairline bg-surface p-6">
            <p className="font-display text-lg font-bold text-ink">
              Details could not be loaded.
            </p>
            <p className="mt-2 text-sm text-ink-dim">
              {detailsQuery.error.message}
            </p>
            <button
              type="button"
              onClick={() => detailsQuery.refetch()}
              className="mt-4 rounded-ctl bg-accent px-4 py-2 text-sm font-semibold text-canvas"
            >
              Try again
            </button>
          </div>
        )}

        {details && (
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={rise}>
              <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">
                {details.title || "Unknown title"}
              </h1>
              {metaParts.length > 0 && (
                <p className="mt-2 text-sm text-ink-dim">
                  {metaParts.join(" · ")}
                </p>
              )}
              {details.tagline && (
                <p className="mt-2 text-sm italic text-ink-dim">
                  {details.tagline}
                </p>
              )}
            </motion.div>

            <motion.div
              variants={rise}
              role="tablist"
              aria-label="About this title"
              className="material-card mt-6 flex w-max gap-0.5 rounded-ctl p-0.5 max-lg:max-w-full max-lg:overflow-x-auto"
            >
              {tabs.map((tab, index) => {
                const selected = tab === activeTab;
                return (
                  <button
                    key={tab}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`${tabIdBase}-tab-${tab}`}
                    aria-selected={selected}
                    aria-controls={`${tabIdBase}-panel-${tab}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                    className="relative rounded-ctl px-3.5 py-1.5 text-sm transition-colors duration-[250ms] ease-in-out"
                  >
                    {selected && (
                      <motion.span
                        layoutId="watch-tab-active"
                        aria-hidden="true"
                        transition={{ type: "spring", stiffness: 180, damping: 24 }}
                        className="absolute inset-0 rounded-ctl bg-surface-2"
                      />
                    )}
                    <span
                      className={`relative ${
                        selected ? "text-ink" : "text-ink-dim hover:text-ink"
                      }`}
                    >
                      {TAB_LABELS[tab]}
                    </span>
                  </button>
                );
              })}
            </motion.div>

            <motion.div
              variants={rise}
              role="tabpanel"
              id={`${tabIdBase}-panel-${activeTab}`}
              aria-labelledby={`${tabIdBase}-tab-${activeTab}`}
              tabIndex={0}
              className="material-card mt-4 rounded-hero p-4 md:p-6"
            >
              {activeTab === "episodes" && mediaType === "tv" && (
                <EpisodeList
                  key={season}
                  tvId={id}
                  seasons={details.seasons}
                  activeSeason={season}
                  activeEpisode={episode}
                  onNavigate={navigateEpisode}
                />
              )}
              {activeTab === "cast" && (
                <>
                  {details.cast.length > 0 ? (
                    <CastScroller cast={details.cast} />
                  ) : (
                    <p className="text-sm text-ink-dim">
                      No cast is listed for this title yet.
                    </p>
                  )}
                </>
              )}
              {activeTab === "similar" && (
                <>
                  {details.similar.length === 0 &&
                    !detailsQuery.isRefetching && (
                      <p className="text-sm text-ink-dim">
                        TMDB lists no similar titles for this one yet.
                      </p>
                    )}
                  <MediaRow
                    title="More like this"
                    items={details.similar}
                    loading={detailsQuery.isPending}
                    error={
                      detailsQuery.error ? detailsQuery.error.message : null
                    }
                    hideWhenEmpty
                  />
                </>
              )}
            </motion.div>
          </motion.div>
        )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
