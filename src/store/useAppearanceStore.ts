import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppearanceState {
  glass: boolean;
  setGlass: (v: boolean) => void;
  toggleGlass: () => void;
  windowGlass: boolean;
  setWindowGlass: (v: boolean) => void;
  toggleWindowGlass: () => void;
  ambientBackdrop: boolean;
  setAmbientBackdrop: (v: boolean) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      glass: false,
      setGlass: (v) => set({ glass: v }),
      toggleGlass: () => set((s) => ({ glass: !s.glass })),
      // default on: the spatial theater design is built on native vibrancy
      windowGlass: true,
      setWindowGlass: (v) => set({ windowGlass: v }),
      toggleWindowGlass: () => set((s) => ({ windowGlass: !s.windowGlass })),
      // default on: owner-requested projector haze behind the window glass
      ambientBackdrop: true,
      setAmbientBackdrop: (v) => set({ ambientBackdrop: v }),
    }),
    {
      name: "cryonex-appearance",
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AppearanceState>;
        if (version < 2) {
          // one-time flip: window glass is the design now, old stored false never returns
          return { ...state, windowGlass: true } as AppearanceState;
        }
        return state as AppearanceState;
      },
    },
  ),
);
