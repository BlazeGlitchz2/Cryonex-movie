import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { fetchSeasonEpisodes, tmdbImageUrl } from "../../services/tmdb";
import type { Season } from "../../types/media";

interface EpisodeListProps {
  tvId: number;
  seasons: Season[];
  activeSeason: number;
  activeEpisode: number;
  onNavigate: (season: number, episode: number) => void;
}

export default function EpisodeList({
  tvId,
  seasons,
  activeSeason,
  activeEpisode,
  onNavigate,
}: EpisodeListProps) {
  const [selectedSeason, setSelectedSeason] = useState(activeSeason);

  const episodesQuery = useQuery({
    queryKey: ["episodes", tvId, selectedSeason],
    queryFn: () => fetchSeasonEpisodes(tvId, selectedSeason),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const episodes = episodesQuery.data;

  return (
    <div>
      <div className="flex items-center gap-3">
        <label htmlFor="season-select" className="text-sm text-ink-dim">
          Season
        </label>
        <div className="relative">
          <select
            id="season-select"
            value={selectedSeason}
            onChange={(event) =>
              setSelectedSeason(Number(event.target.value))
            }
            className="appearance-none rounded-ctl border border-hairline bg-surface min-h-11 py-2 pl-3 pr-8 text-sm text-ink transition-colors duration-[250ms] ease-in-out hover:bg-surface-2"
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
        <div className="mt-4 grid gap-4 md:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex gap-3 rounded-card p-2">
              <div className="shimmer aspect-video w-36 shrink-0 rounded-ctl" />
              <div className="flex-1 space-y-2 py-1">
                <div className="shimmer h-3.5 w-3/4 rounded-ctl" />
                <div className="shimmer h-3 w-1/3 rounded-ctl" />
                <div className="shimmer h-3 w-full rounded-ctl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {episodesQuery.isError && (
        <div className="mt-4 rounded-card border border-hairline bg-surface p-4">
          <p className="text-sm text-ink">
            Episodes could not be loaded. {episodesQuery.error.message}
          </p>
          <button
            type="button"
            onClick={() => episodesQuery.refetch()}
            className="mt-3 rounded-ctl bg-accent px-4 py-2 text-sm font-semibold text-canvas"
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
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {episodes.map((episode) => {
            const isCurrent =
              selectedSeason === activeSeason &&
              episode.episodeNumber === activeEpisode;
            const metaParts = [
              episode.runtime ? `${episode.runtime} min` : null,
              episode.airDate ? episode.airDate.slice(0, 4) : null,
            ].filter((part): part is string => part !== null);
            return (
              <button
                key={episode.id}
                type="button"
                aria-current={isCurrent || undefined}
                onClick={() =>
                  onNavigate(selectedSeason, episode.episodeNumber)
                }
                className={`group flex w-full gap-3 rounded-card p-2 text-left transition-colors duration-[350ms] ease-in-out ${
                  isCurrent
                    ? "material-card ring-1 ring-accent"
                    : "material-card hover:border-white/20"
                }`}
              >
                <div className="aspect-video w-36 shrink-0 overflow-hidden rounded-ctl bg-surface-2">
                  {episode.stillPath ? (
                    <img
                      src={tmdbImageUrl(episode.stillPath, "w500")}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div
                      className="shimmer h-full w-full"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                      {isCurrent && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                      )}
                      E{episode.episodeNumber}
                    </span>
                    <span className="truncate text-sm text-ink">
                      {episode.name || `Episode ${episode.episodeNumber}`}
                    </span>
                  </div>
                  {metaParts.length > 0 && (
                    <p className="mt-1 text-xs text-ink-dim">
                      {metaParts.join(" · ")}
                    </p>
                  )}
                  {episode.overview && (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-dim">
                      {episode.overview}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
