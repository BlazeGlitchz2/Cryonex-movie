import { create } from "zustand";
import type { MediaType } from "../types/media";

interface UIState {
  commandOpen: boolean;
  sourcesOpen: boolean;
  detail: { id: number; mediaType: MediaType } | null;
  setCommandOpen: (v: boolean) => void;
  setSourcesOpen: (v: boolean) => void;
  openDetail: (item: { id: number; mediaType: MediaType }) => void;
  closeDetail: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  sourcesOpen: false,
  detail: null,
  setCommandOpen: (v) => set({ commandOpen: v }),
  setSourcesOpen: (v) => set({ sourcesOpen: v }),
  openDetail: (item) =>
    // opening details from anywhere supersedes the palette
    set({ commandOpen: false, detail: item }),
  closeDetail: () => set({ detail: null }),
}));
