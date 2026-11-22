import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getItem,
  removeItem,
  setItem,
} from "../services/profileStorage";

interface SearchHistoryState {
  recent: string[];
  addRecent: (query: string) => void;
  removeRecent: (query: string) => void;
  clearRecent: () => void;
}

const MAX_RECENT = 8;

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      recent: [],
      addRecent: (query) =>
        set((state) => ({
          // dedupe keeps the newest first order stable on repeats
          recent: [
            query,
            ...state.recent.filter((q) => q !== query),
          ].slice(0, MAX_RECENT),
        })),
      removeRecent: (query) =>
        set((state) => ({
          recent: state.recent.filter((q) => q !== query),
        })),
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: "cryonex-search-history",
      // storage adapter namespaces this record by the active profile
      storage: createJSONStorage(() => ({
        getItem,
        setItem,
        removeItem,
      })),
    },
  ),
);
