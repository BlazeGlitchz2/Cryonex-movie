import { create } from "zustand";
import { persist } from "zustand/middleware";

export const PROFILE_COLORS = [
  { id: "crimson", label: "Crimson", hex: "#E50914" },
  { id: "blue", label: "Blue", hex: "#0073E6" },
  { id: "amber", label: "Amber", hex: "#F5B50A" },
  { id: "emerald", label: "Emerald", hex: "#2E9E4F" },
  { id: "violet", label: "Violet", hex: "#7B5BE6" },
] as const;

export type ProfileColor = (typeof PROFILE_COLORS)[number]["id"];

export interface Profile {
  id: string;
  name: string;
  color: ProfileColor;
}

export const PROFILE_HEX: Record<ProfileColor, string> = Object.fromEntries(
  PROFILE_COLORS.map((color) => [color.id, color.hex]),
) as Record<ProfileColor, string>;

// amber is the one light tile, dark text keeps the initial at AA contrast
export function profileInitialInk(color: ProfileColor): string {
  return color === "amber" ? "#121312" : "#FFFFFF";
}

export function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
  pickerOpen: boolean;
  manageOpen: boolean;
  addProfile: (name: string, color: ProfileColor) => void;
  renameProfile: (id: string, name: string) => void;
  setProfileColor: (id: string, color: ProfileColor) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  setPickerOpen: (open: boolean) => void;
  setManageOpen: (open: boolean) => void;
}

// runs before the app store rehydrates through the profile adapter, copying
// the shared legacy records once so existing watchlist and continue watching
// data survive as Hamza's namespaced data
function migrateLegacyData(): void {
  for (const key of ["cryonex-store", "cryonex-search-history"]) {
    const legacy = localStorage.getItem(key);
    if (legacy !== null && localStorage.getItem(`${key}::hamza`) === null) {
      localStorage.setItem(`${key}::hamza`, legacy);
    }
  }
}

migrateLegacyData();

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profiles: [{ id: "hamza", name: "Hamza", color: "crimson" }],
      activeProfileId: "hamza",
      pickerOpen: false,
      manageOpen: false,
      addProfile: (name, color) =>
        set((state) => ({
          profiles: [
            ...state.profiles,
            { id: crypto.randomUUID(), name, color },
          ],
        })),
      renameProfile: (id, name) =>
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id ? { ...profile, name } : profile,
          ),
        })),
      setProfileColor: (id, color) =>
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id ? { ...profile, color } : profile,
          ),
        })),
      deleteProfile: (id) =>
        set((state) => {
          if (state.profiles.length <= 1) {
            return {};
          }
          // persist names live here too: importing the store modules would
          // create a module-load cycle with the profile storage adapter
          localStorage.removeItem(`cryonex-store::${id}`);
          localStorage.removeItem(`cryonex-search-history::${id}`);
          const profiles = state.profiles.filter(
            (profile) => profile.id !== id,
          );
          return {
            profiles,
            activeProfileId:
              state.activeProfileId === id
                ? profiles[0]?.id ?? null
                : state.activeProfileId,
          };
        }),
      setActiveProfile: (id) =>
        set({ activeProfileId: id, pickerOpen: false }),
      setPickerOpen: (open) => set({ pickerOpen: open }),
      setManageOpen: (open) => set({ manageOpen: open }),
    }),
    {
      name: "cryonex-profiles",
      // pickerOpen and manageOpen are session UI state, never persisted
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    },
  ),
);

// the gate opens on launch only when there is a real choice to make
if (useProfileStore.getState().profiles.length > 1) {
  useProfileStore.setState({ pickerOpen: true });
}
