import type {
  Episode,
  Genre,
  MediaDetails,
  MediaItem,
  MediaType,
  TitleLogo,
  Video,
} from "../types/media";

const BASE_URL = "https://api.themoviedb.org/3";

export class TmdbError extends Error {
  // 4xx answers are final, so retrying them only wastes the player's time
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = "TmdbError";
    this.retryable = retryable;
  }
}

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  if (!apiKey) {
    throw new TmdbError(
      "TMDB API key is missing. Set VITE_TMDB_API_KEY in your .env file.",
      false,
    );
  }
  return apiKey;
}

async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  // a stalled request must fail into the retry path, not hold a skeleton forever
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    throw new TmdbError("Could not reach TMDB. Check your internet connection.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new TmdbError(
      `TMDB request to ${path} failed with HTTP ${response.status}.`,
      response.status >= 500 || response.status === 429,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new TmdbError("TMDB returned a response that is not valid JSON.");
  }
}

interface RawMedia {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genre_ids?: number[];
}

interface RawListResponse {
  results: RawMedia[];
}

interface RawLogo {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
}

interface RawCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface RawSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  overview: string;
}

interface RawDetails extends RawMedia {
  tagline: string | null;
  status: string;
  genres: Genre[];
  runtime?: number | null;
  episode_run_time?: number[];
  images?: { logos?: RawLogo[] };
  videos?: { results?: Video[] };
  credits?: { cast?: RawCastMember[] };
  similar?: { results?: RawMedia[] };
  seasons?: RawSeason[];
  number_of_seasons?: number;
  number_of_episodes?: number;
}

interface RawEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
  vote_average: number;
}

function toYear(date: string | undefined): number | null {
  if (!date) {
    return null;
  }
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function toMediaItem(raw: RawMedia, mediaType: MediaType): MediaItem {
  const title = mediaType === "movie" ? raw.title : raw.name;
  const releaseDate =
    mediaType === "movie" ? raw.release_date : raw.first_air_date;
  return {
    id: raw.id,
    mediaType,
    title: title ?? "",
    overview: raw.overview,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    voteAverage: raw.vote_average,
    releaseYear: toYear(releaseDate),
    genreIds: raw.genre_ids ?? [],
  };
}

function isMovieOrTv(
  raw: RawMedia,
): raw is RawMedia & { media_type: MediaType } {
  return raw.media_type === "movie" || raw.media_type === "tv";
}

function toTitleLogos(logos: RawLogo[]): TitleLogo[] {
  return logos
    .filter((logo) => logo.iso_639_1 === "en" || logo.iso_639_1 === null)
    .sort((a, b) => {
      if (a.iso_639_1 !== b.iso_639_1) {
        return a.iso_639_1 === "en" ? -1 : 1;
      }
      return b.vote_average - a.vote_average;
    })
    .map((logo) => ({ filePath: logo.file_path }));
}

export function tmdbImageUrl(
  path: string,
  size: "w500" | "w780" | "w1280" | "original",
): string {
  // TMDB paths arrive with a leading slash already, so strip it to avoid // in the CDN URL
  return `https://image.tmdb.org/t/p/${size}/${path.replace(/^\/+/, "")}`;
}

async function fetchMediaList(
  path: string,
  mediaType: MediaType,
): Promise<MediaItem[]> {
  const data = await tmdbFetch<RawListResponse>(path);
  return data.results.map((raw) => toMediaItem(raw, mediaType));
}

export async function fetchTrendingAll(): Promise<MediaItem[]> {
  const data = await tmdbFetch<RawListResponse>("/trending/all/week");
  return data.results
    .filter(isMovieOrTv)
    .map((raw) => toMediaItem(raw, raw.media_type));
}

export async function fetchPopularMovies(): Promise<MediaItem[]> {
  return fetchMediaList("/movie/popular", "movie");
}

export async function fetchTopRatedMovies(): Promise<MediaItem[]> {
  return fetchMediaList("/movie/top_rated", "movie");
}

export async function fetchUpcomingMovies(): Promise<MediaItem[]> {
  return fetchMediaList("/movie/upcoming", "movie");
}

export async function fetchPopularTv(): Promise<MediaItem[]> {
  return fetchMediaList("/tv/popular", "tv");
}

export async function fetchTopRatedTv(): Promise<MediaItem[]> {
  return fetchMediaList("/tv/top_rated", "tv");
}

export async function fetchAiringTodayTv(): Promise<MediaItem[]> {
  return fetchMediaList("/tv/airing_today", "tv");
}

export async function searchMulti(query: string): Promise<MediaItem[]> {
  const data = await tmdbFetch<RawListResponse>("/search/multi", { query });
  return data.results
    .filter(isMovieOrTv)
    .map((raw) => toMediaItem(raw, raw.media_type));
}

export async function fetchMediaDetails(
  mediaType: MediaType,
  id: number,
): Promise<MediaDetails> {
  // TMDB expects the literal string "null" to include language-neutral logos.
  const raw = await tmdbFetch<RawDetails>(`/${mediaType}/${id}`, {
    append_to_response: "images,videos,credits,similar",
    include_image_language: "en,null",
  });
  const runtime =
    mediaType === "movie"
      ? raw.runtime ?? null
      : raw.episode_run_time?.find((minutes) => minutes > 0) ?? null;
  return {
    ...toMediaItem(raw, mediaType),
    genreIds: raw.genres.map((genre) => genre.id),
    tagline: raw.tagline || null,
    runtime,
    genres: raw.genres,
    titleLogos: toTitleLogos(raw.images?.logos ?? []),
    videos: raw.videos?.results ?? [],
    cast: (raw.credits?.cast ?? []).slice(0, 15).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profilePath: member.profile_path,
    })),
    similar: (raw.similar?.results ?? []).map((item) =>
      toMediaItem(item, mediaType),
    ),
    seasons: (raw.seasons ?? []).map((season) => ({
      id: season.id,
      seasonNumber: season.season_number,
      name: season.name,
      episodeCount: season.episode_count,
      posterPath: season.poster_path,
      overview: season.overview,
    })),
    numberOfSeasons: raw.number_of_seasons ?? 0,
    numberOfEpisodes: raw.number_of_episodes ?? 0,
    status: raw.status,
  };
}

export async function fetchSeasonEpisodes(
  tvId: number,
  seasonNumber: number,
): Promise<Episode[]> {
  const data = await tmdbFetch<{ episodes: RawEpisode[] }>(
    `/tv/${tvId}/season/${seasonNumber}`,
  );
  return data.episodes.map((episode) => ({
    id: episode.id,
    seasonNumber: episode.season_number,
    episodeNumber: episode.episode_number,
    name: episode.name,
    overview: episode.overview,
    stillPath: episode.still_path,
    runtime: episode.runtime,
    airDate: episode.air_date,
    voteAverage: episode.vote_average,
  }));
}

export async function fetchGenres(mediaType: MediaType): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: Genre[] }>(
    `/genre/${mediaType}/list`,
  );
  return data.genres;
}

export async function fetchByGenre(
  mediaType: MediaType,
  genreId: number,
): Promise<MediaItem[]> {
  return tmdbFetch<RawListResponse>(`/discover/${mediaType}`, {
    with_genres: genreId,
    sort_by: "popularity.desc",
    "vote_count.gte": 50,
  }).then((data) => data.results.map((raw) => toMediaItem(raw, mediaType)));
}
