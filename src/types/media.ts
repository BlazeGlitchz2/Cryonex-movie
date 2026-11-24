export type MediaType = "movie" | "tv";

export interface MediaItem {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  releaseYear: number | null;
  genreIds: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface TitleLogo {
  filePath: string;
}

export interface Video {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  posterPath: string | null;
  overview: string;
}

export interface Episode {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  runtime: number | null;
  airDate: string | null;
  voteAverage: number;
}

export interface MediaDetails extends MediaItem {
  tagline: string | null;
  runtime: number | null;
  genres: Genre[];
  titleLogos: TitleLogo[];
  videos: Video[];
  cast: CastMember[];
  similar: MediaItem[];
  seasons: Season[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: string;
}

export interface WatchlistEntry {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  releaseYear: number | null;
  addedAt: number;
}

export interface ContinueWatchingEntry {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  season: number | null;
  episode: number | null;
  lastWatchedAt: number;
}

export interface StreamProvider {
  id: string;
  name: string;
  badge: string | null;
  movieTemplate: string;
  tvTemplate: string;
  enabled: boolean;
  // default false: the sandbox stays on so popups and redirects stay blocked.
  // Opt out only for sources that refuse to play inside the sandbox.
  sandboxBypass?: boolean;
}

export const buildProviderUrl = (
  provider: StreamProvider,
  mediaType: MediaType,
  tmdbId: number,
  season?: number,
  episode?: number,
): string => {
  if (mediaType === "movie") {
    return provider.movieTemplate.replace("{id}", String(tmdbId));
  }
  return provider.tvTemplate
    .replace("{id}", String(tmdbId))
    .replace("{season}", String(season ?? 1))
    .replace("{episode}", String(episode ?? 1));
};
