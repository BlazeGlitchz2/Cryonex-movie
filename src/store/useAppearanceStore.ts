import { create } from "zustand";
import { persist } from "zustand/middleware";

// owner-requested wallpaper presets; every palette stays inside the
// design system (emerald accent, warm white ink, profile hues as light)
export type AmbientPreset =
  | "off"
  | "projector"
  | "aurora"
  | "ember"
  | "spotlight"
  | "gradient"
  | "custom";

export const AMBIENT_PRESETS: {
  id: AmbientPreset;
  label: string;
}[] = [
  { id: "off", label: "Off" },
  { id: "projector", label: "Projector" },
  { id: "aurora", label: "Aurora" },
  { id: "ember", label: "Ember" },
  { id: "spotlight", label: "Spotlight" },
  { id: "gradient", label: "Gradient" },
  { id: "custom", label: "Custom image" },
];

// stored at this key as a downscaled JPEG data URL; a wallpaper-sized
// PNG would blow the localStorage budget
export const WALLPAPER_KEY = "cryonex-wallpaper";

interface AppearanceState {
  glass: boolean;
  setGlass: (v: boolean) => void;
  toggleGlass: () => void;
  windowGlass: boolean;
  setWindowGlass: (v: boolean) => void;
  toggleWindowGlass: () => void;
  ambientBackdrop: AmbientPreset;
  setAmbientBackdrop: (v: AmbientPreset) => void;
  // 0 to 100, scales every preset's light; custom images dim their scrim
  ambientIntensity: number;
  setAmbientIntensity: (v: number) => void;
  // compatibility mode: native blocker off and every player sandbox off,
  // for sources that refuse to play any other way
  compatibilityMode: boolean;
  setCompatibilityMode: (v: boolean) => void;
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
      ambientIntensity: 60,
      setAmbientIntensity: (v) => set({ ambientIntensity: v }),
      compatibilityMode: false,
      setCompatibilityMode: (v) => set({ compatibilityMode: v }),
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
