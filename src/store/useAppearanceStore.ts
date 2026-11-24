import { create } from "zustand";
import { persist } from "zustand/middleware";

// owner-requested wallpaper presets; every palette stays inside the
// design system (emerald accent, warm white ink, profile hues as light)
export type AmbientPreset = "off" | "projector" | "aurora" | "ember" | "spotlight";

export const AMBIENT_PRESETS: {
  id: AmbientPreset;
  label: string;
}[] = [
  { id: "off", label: "Off" },
  { id: "projector", label: "Projector" },
  { id: "aurora", label: "Aurora" },
  { id: "ember", label: "Ember" },
  { id: "spotlight", label: "Spotlight" },
];

interface AppearanceState {
  glass: boolean;
  setGlass: (v: boolean) => void;
  toggleGlass: () => void;
  windowGlass: boolean;
  setWindowGlass: (v: boolean) => void;
  toggleWindowGlass: () => void;
  ambientBackdrop: AmbientPreset;
  setAmbientBackdrop: (v: AmbientPreset) => void;
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
      // default projector: owner-requested drifting light behind the glass
      ambientBackdrop: "projector",
      setAmbientBackdrop: (v) => set({ ambientBackdrop: v }),
    }),
    {
      name: "cryonex-appearance",
      version: 3,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AppearanceState> & {
          ambientBackdrop?: boolean | AmbientPreset;
        };
        if (version < 3) {
          // v2 stored a boolean; true becomes the projector preset
          return {
            ...state,
            ambientBackdrop:
              typeof state.ambientBackdrop === "string"
                ? state.ambientBackdrop
                : state.ambientBackdrop === false
                  ? "off"
                  : "projector",
          } as AppearanceState;
        }
        return state as AppearanceState;
      },
    },
  ),
);
