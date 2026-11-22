import { useQuery } from "@tanstack/react-query";
import { BentoHero } from "../components/home/BentoHero";
import { ContinueWatchingRow } from "../components/home/ContinueWatchingRow";
import { Top10Row } from "../components/home/Top10Row";
import {
  MediaRow,
  queryErrorMessage,
  standardQueryOptions,
} from "../components/shared/MediaRow";
import {
  fetchMediaDetails,
  fetchPopularMovies,
  fetchPopularTv,
  fetchTopRatedMovies,
  fetchTopRatedTv,
  fetchTrendingAll,
} from "../services/tmdb";
import { useAppStore } from "../store/useAppStore";

// the bento owns the first five trending titles; the row skips them so no duplicate layoutId collides
const HERO_TRENDING_COUNT = 5;

// Top 10 ranks are the trending list order itself, never an invented rank
const TOP10_COUNT = 10;

export function HomePage() {
  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrendingAll,
    ...standardQueryOptions,
  });
  const popularMovies = useQuery({
    queryKey: ["popular-movies"],
    queryFn: fetchPopularMovies,
    ...standardQueryOptions,
  });
  const popularSeries = useQuery({
    queryKey: ["popular-tv"],
    queryFn: fetchPopularTv,
    ...standardQueryOptions,
  });
  const topRatedMovies = useQuery({
    queryKey: ["top-rated-movies"],
    queryFn: fetchTopRatedMovies,
    ...standardQueryOptions,
  });
  const topRatedSeries = useQuery({
    queryKey: ["top-rated-tv"],
    queryFn: fetchTopRatedTv,
    ...standardQueryOptions,
  });
  const continueWatching = useAppStore((state) => state.continueWatching);
  const newestWatched = continueWatching[0];
  const becauseQuery = useQuery({
    queryKey: ["details", newestWatched?.mediaType, newestWatched?.id],
    queryFn: () => {
      // guard only satisfies the type, the query is disabled without an entry
      if (!newestWatched) {
        return Promise.reject(
          new Error("No continue watching entry to base recommendations on."),
        );
      }
      return fetchMediaDetails(newestWatched.mediaType, newestWatched.id);
    },
    enabled: newestWatched !== undefined,
    ...standardQueryOptions,
  });

  return (
    <div>
      <div className="space-y-8 px-8 pb-10 pt-6">
        <BentoHero
          items={trending.data ?? []}
          loading={trending.isLoading}
          error={queryErrorMessage(trending.error)}
        />
        <ContinueWatchingRow />
        <Top10Row
          title="Top 10 Movies Today"
          items={(trending.data ?? [])
            .filter((item) => item.mediaType === "movie")
            .slice(0, TOP10_COUNT)}
          loading={trending.isLoading}
          error={queryErrorMessage(trending.error)}
        />
        {newestWatched && (
          <MediaRow
            title={`Because you watched ${newestWatched.title}`}
            items={becauseQuery.data?.similar ?? []}
            loading={becauseQuery.isLoading}
            error={queryErrorMessage(becauseQuery.error)}
            hideWhenEmpty
          />
        )}
        <MediaRow
          title="Trending Now"
          items={(trending.data ?? []).slice(HERO_TRENDING_COUNT)}
          loading={trending.isLoading}
          error={queryErrorMessage(trending.error)}
        />
        <MediaRow
          title="Popular Movies"
          items={popularMovies.data ?? []}
          loading={popularMovies.isLoading}
          error={queryErrorMessage(popularMovies.error)}
        />
        <MediaRow
          title="Popular Series"
          items={popularSeries.data ?? []}
          loading={popularSeries.isLoading}
          error={queryErrorMessage(popularSeries.error)}
        />
        <MediaRow
          title="Top Rated Movies"
          items={topRatedMovies.data ?? []}
          loading={topRatedMovies.isLoading}
          error={queryErrorMessage(topRatedMovies.error)}
        />
        <MediaRow
          title="Top Rated Series"
          items={topRatedSeries.data ?? []}
          loading={topRatedSeries.isLoading}
          error={queryErrorMessage(topRatedSeries.error)}
        />
      </div>
    </div>
  );
}

export default HomePage;
