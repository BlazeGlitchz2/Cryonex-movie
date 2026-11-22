import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MediaRow,
  queryErrorMessage,
  standardQueryOptions,
} from "../components/shared/MediaRow";
import {
  fetchByGenre,
  fetchGenres,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
} from "../services/tmdb";

const chipClass = (active: boolean) =>
  `shrink-0 rounded-ctl border px-3.5 py-1.5 text-sm transition-colors duration-250 ease-in-out ${
    active
      ? "border-transparent bg-accent font-medium text-canvas"
      : "border-hairline bg-surface text-ink-dim hover:border-white/15 hover:text-ink"
  }`;

export function MoviesPage() {
  const [genreId, setGenreId] = useState<number | null>(null);
  const genres = useQuery({
    queryKey: ["genres", "movie"],
    queryFn: () => fetchGenres("movie"),
    ...standardQueryOptions,
  });
  const byGenre = useQuery({
    queryKey: ["by-genre", "movie", genreId],
    queryFn: () => fetchByGenre("movie", genreId as number),
    enabled: genreId !== null,
    ...standardQueryOptions,
  });
  const popular = useQuery({
    queryKey: ["popular-movies"],
    queryFn: fetchPopularMovies,
    ...standardQueryOptions,
  });
  const upcoming = useQuery({
    queryKey: ["upcoming-movies"],
    queryFn: fetchUpcomingMovies,
    ...standardQueryOptions,
  });
  const topRated = useQuery({
    queryKey: ["top-rated-movies"],
    queryFn: fetchTopRatedMovies,
    ...standardQueryOptions,
  });
  const activeGenreName =
    genres.data?.find((genre) => genre.id === genreId)?.name ?? "";

  return (
    <div className="px-8 pb-10 pt-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Movies</h1>
      {genres.isPending && (
        <div className="mt-4 flex gap-2 overflow-hidden pb-1" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shimmer h-9 w-20 shrink-0 rounded-ctl" />
          ))}
        </div>
      )}
      {genres.isError && (
        <p className="mt-4 text-sm text-ink-dim">
          Genres could not load. {queryErrorMessage(genres.error)} The rows
          below still work.
        </p>
      )}
      {genres.data && (
        <div
          className="mt-4 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1"
          role="group"
          aria-label="Browse by genre"
        >
          <button
            type="button"
            onClick={() => setGenreId(null)}
            aria-pressed={genreId === null}
            className={chipClass(genreId === null)}
          >
            All
          </button>
          {genres.data.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => setGenreId(genre.id)}
              aria-pressed={genreId === genre.id}
              className={chipClass(genreId === genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-8 space-y-8">
        {genreId !== null && (
          <MediaRow
            title={activeGenreName}
            items={byGenre.data ?? []}
            loading={byGenre.isLoading}
            error={queryErrorMessage(byGenre.error)}
            hideWhenEmpty
          />
        )}
        <MediaRow
          title="Popular Movies"
          items={popular.data ?? []}
          loading={popular.isLoading}
          error={queryErrorMessage(popular.error)}
        />
        <MediaRow
          title="Upcoming Movies"
          items={upcoming.data ?? []}
          loading={upcoming.isLoading}
          error={queryErrorMessage(upcoming.error)}
        />
        <MediaRow
          title="Top Rated Movies"
          items={topRated.data ?? []}
          loading={topRated.isLoading}
          error={queryErrorMessage(topRated.error)}
        />
      </div>
    </div>
  );
}

export default MoviesPage;
