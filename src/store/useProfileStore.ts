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

export const GUEST_ID = "guest";

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
  pickerOpen: boolean;
  manageOpen: boolean;
  addProfile: (name: string, color: ProfileColor) => string;
  ensureGuestProfile: () => void;
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
      profiles: [],
      activeProfileId: null,
      pickerOpen: false,
      manageOpen: false,
      addProfile: (name: string, color: ProfileColor) => {
    const id = crypto.randomUUID();
    set((state) => ({
      profiles: [...state.profiles, { id, name, color }],
    }));
    return id;
  },
  ensureGuestProfile: () =>
    set((state) => {
      if (state.profiles.some((profile) => profile.id === GUEST_ID)) {
        return {};
      }
      return {
        profiles: [...state.profiles, { id: GUEST_ID, name: "Guest", color: "violet" }],
      };
    }),
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
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as
          | { profiles?: Profile[]; activeProfileId?: string | null }
          | undefined;
        // drop the old auto-seeded Hamza for visitors who never saved anything,
        // so first-run shows the create-profile gate instead of a stranger's name
        const seeded =
          state?.profiles?.length === 1 &&
          state.profiles[0]?.id === "hamza" &&
          state.profiles[0]?.name === "Hamza";
        const hasHamzaData =
          localStorage.getItem("cryonex-store::hamza") !== null ||
          localStorage.getItem("cryonex-search-history::hamza") !== null;
        if (version < 3 && seeded && !hasHamzaData) {
          return { ...state, profiles: [], activeProfileId: null };
        }
        return state;
      },
      // pickerOpen and manageOpen are session UI state, never persisted
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    },
  ),
);

// First-run decisions: an existing owner (legacy data present) keeps the
// Hamza profile bound to those records; everyone else starts empty and
// creates their own profile through the gate.
{
  const state = useProfileStore.getState();
  const hasHamzaData =
    localStorage.getItem("cryonex-store::hamza") !== null ||
    localStorage.getItem("cryonex-search-history::hamza") !== null;
  if (state.profiles.length === 0 && hasHamzaData) {
    useProfileStore.setState({
      profiles: [{ id: "hamza", name: "Hamza", color: "crimson" }],
      activeProfileId: "hamza",
      pickerOpen: false,
    });
  } else if (state.profiles.length === 0 || state.profiles.length > 1) {
    useProfileStore.setState({ pickerOpen: true });
  }
}
