import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getItem,
  removeItem,
  setItem,
} from "../services/profileStorage";
import type {
  ContinueWatchingEntry,
  MediaType,
  StreamProvider,
  WatchlistEntry,
} from "../types/media";

interface AppState {
  watchlist: WatchlistEntry[];
  continueWatching: ContinueWatchingEntry[];
  providers: StreamProvider[];
  activeProviderId: string;
  cinemaDim: boolean;
  isInWatchlist: (id: number, mediaType: MediaType) => boolean;
  toggleWatchlist: (entry: Omit<WatchlistEntry, "addedAt">) => void;
  removeFromWatchlist: (id: number, mediaType: MediaType) => void;
  recordWatch: (entry: Omit<ContinueWatchingEntry, "lastWatchedAt">) => void;
  removeFromContinueWatching: (id: number, mediaType: MediaType) => void;
  addProvider: (p: StreamProvider) => void;
  updateProvider: (id: string, patch: Partial<StreamProvider>) => void;
  removeProvider: (id: string) => void;
  toggleProviderEnabled: (id: string) => void;
  moveProvider: (id: string, direction: -1 | 1) => void;
  setActiveProvider: (id: string) => void;
  toggleCinemaDim: () => void;
}

// order = curl timing (movie 550 + tv 1396/1/1 avg, single run per URL)
// first ten are the primary set, the rest are verified backups
const DEFAULT_PROVIDERS: StreamProvider[] = [
  {
    id: "vidzee",
    name: "Vidzee",
    badge: "Fast",
    movieTemplate: "https://player.vidzee.wtf/embed/movie/{id}",
    tvTemplate: "https://player.vidzee.wtf/embed/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "peachify",
    name: "Peachify",
    badge: "Fast",
    movieTemplate: "https://peachify.net/movie/{id}",
    tvTemplate: "https://peachify.net/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidora",
    name: "Vidora",
    badge: "Backup",
    movieTemplate: "https://vidora.su/movie/{id}",
    tvTemplate: "https://vidora.su/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidrift",
    name: "VidRift",
    badge: "Fast",
    movieTemplate: "https://embed.vidrift.net/embed/movie/{id}",
    tvTemplate:
      "https://embed.vidrift.net/embed/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "ythd",
    name: "YTHD",
    badge: "Backup",
    movieTemplate: "https://ythd.org/embed/{id}",
    tvTemplate: "https://ythd.org/embed/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidsrc",
    name: "VidSrc",
    badge: "Backup",
    movieTemplate: "https://vidsrc.to/embed/movie/{id}",
    tvTemplate: "https://vidsrc.to/embed/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidlink",
    name: "VidLink",
    badge: "4K",
    movieTemplate: "https://vidlink.pro/movie/{id}",
    tvTemplate: "https://vidlink.pro/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidsrc-net",
    name: "VidSrc.net",
    badge: "Backup",
    movieTemplate: "https://vidsrc.net/embed/movie?tmdb={id}",
    tvTemplate:
      "https://vidsrc.net/embed/tv?tmdb={id}&season={season}&episode={episode}",
    enabled: true,
  },
  {
    id: "2embed",
    name: "2Embed",
    badge: "Backup",
    movieTemplate: "https://www.2embed.cc/embed/{id}",
    tvTemplate: "https://www.2embed.cc/embedtv/{id}&s={season}&e={episode}",
    enabled: true,
  },
  {
    id: "vidfast",
    name: "VidFast",
    badge: "4K",
    movieTemplate: "https://vidfast.vc/movie/{id}",
    tvTemplate: "https://vidfast.vc/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidsrc-me",
    name: "VidSrc.me",
    badge: "Backup",
    movieTemplate: "https://vidsrc.me/embed/movie?tmdb={id}",
    tvTemplate:
      "https://vidsrc.me/embed/tv?tmdb={id}&season={season}&episode={episode}",
    enabled: true,
  },
  {
    id: "vidprime",
    name: "VidPrime",
    badge: "Backup",
    movieTemplate: "https://vidsrc.pm/embed/movie/{id}",
    tvTemplate: "https://vidsrc.pm/embed/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vixsrc",
    name: "VixSrc",
    badge: "Backup",
    movieTemplate: "https://vixsrc.to/movie/{id}",
    tvTemplate: "https://vixsrc.to/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "vidrock",
    name: "VidRock",
    badge: "Backup",
    movieTemplate: "https://vidrock.net/movie/{id}",
    tvTemplate: "https://vidrock.net/tv/{id}/{season}/{episode}",
    enabled: true,
  },
  {
    id: "multiembed",
    name: "MultiEmbed",
    badge: "Backup",
    movieTemplate: "https://multiembed.mov/?video_id={id}",
    tvTemplate:
      "https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}",
    enabled: true,
  },
  {
    id: "vcr",
    name: "2Embed VCR",
    badge: "Backup",
    movieTemplate: "https://streamsrcs.2embed.cc/vcr?tmdb={id}",
    tvTemplate:
      "https://streamsrcs.2embed.cc/vcr?tmdb={id}&season={season}&episode={episode}",
    enabled: true,
  },
];

function resolveActiveProvider(
  providers: StreamProvider[],
  currentId: string,
): string {
  if (providers.some((p) => p.id === currentId && p.enabled)) {
    return currentId;
  }
  return providers.find((p) => p.enabled)?.id ?? "";
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      continueWatching: [],
      providers: DEFAULT_PROVIDERS,
      activeProviderId: DEFAULT_PROVIDERS[0].id,
      cinemaDim: false,
      isInWatchlist: (id, mediaType) =>
        get().watchlist.some(
          (entry) => entry.id === id && entry.mediaType === mediaType,
        ),
      toggleWatchlist: (entry) =>
        set((state) => {
          const exists = state.watchlist.some(
            (w) => w.id === entry.id && w.mediaType === entry.mediaType,
          );
          if (exists) {
            return {
              watchlist: state.watchlist.filter(
                (w) => !(w.id === entry.id && w.mediaType === entry.mediaType),
              ),
            };
          }
          return {
            watchlist: [{ ...entry, addedAt: Date.now() }, ...state.watchlist],
          };
        }),
      removeFromWatchlist: (id, mediaType) =>
        set((state) => ({
          watchlist: state.watchlist.filter(
            (w) => !(w.id === id && w.mediaType === mediaType),
          ),
        })),
      recordWatch: (entry) =>
        set((state) => ({
          continueWatching: [
            { ...entry, lastWatchedAt: Date.now() },
            ...state.continueWatching.filter(
              (c) => !(c.id === entry.id && c.mediaType === entry.mediaType),
            ),
          ],
        })),
      removeFromContinueWatching: (id, mediaType) =>
        set((state) => ({
          continueWatching: state.continueWatching.filter(
            (c) => !(c.id === id && c.mediaType === mediaType),
          ),
        })),
      addProvider: (p) =>
        set((state) => {
          const providers = [...state.providers, p];
          return {
            providers,
            activeProviderId: resolveActiveProvider(
              providers,
              state.activeProviderId,
            ),
          };
        }),
      updateProvider: (id, patch) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      removeProvider: (id) =>
        set((state) => {
          const providers = state.providers.filter((p) => p.id !== id);
          return {
            providers,
            activeProviderId: resolveActiveProvider(
              providers,
              state.activeProviderId,
            ),
          };
        }),
      toggleProviderEnabled: (id) =>
        set((state) => {
          const providers = state.providers.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p,
          );
          return {
            providers,
            activeProviderId: resolveActiveProvider(
              providers,
              state.activeProviderId,
            ),
          };
        }),
      moveProvider: (id, direction) =>
        set((state) => {
          const index = state.providers.findIndex((p) => p.id === id);
          const target = index + direction;
          if (index === -1 || target < 0 || target >= state.providers.length) {
            return {};
          }
          const providers = [...state.providers];
          const moved = providers[index];
          providers[index] = providers[target];
          providers[target] = moved;
          return { providers };
        }),
      setActiveProvider: (id) => set({ activeProviderId: id }),
      toggleCinemaDim: () =>
        set((state) => ({ cinemaDim: !state.cinemaDim })),
    }),
    {
      name: "cryonex-store",
      // storage adapter namespaces this record by the active profile
      storage: createJSONStorage(() => ({
        getItem,
        setItem,
        removeItem,
      })),
      version: 4,
      migrate: (persisted) => {
        const state = persisted as Partial<AppState> | undefined;
        if (!state?.providers) {
          return state as AppState;
        }
        // merge in default providers added after the stored state was written
        const missing = DEFAULT_PROVIDERS.filter(
          (def) => !state.providers?.some((p) => p.id === def.id),
        );
        return {
          ...state,
          providers: [...state.providers, ...missing],
        } as AppState;
      },
      partialize: (state) => ({
        watchlist: state.watchlist,
        continueWatching: state.continueWatching,
        providers: state.providers,
        activeProviderId: state.activeProviderId,
      }),
    },
  ),
);
