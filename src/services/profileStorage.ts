// import order is load-order critical: the profile store must be seeded and
// migrated before the app and search stores rehydrate through this adapter
import { useProfileStore } from "../store/useProfileStore";
import { useAppStore } from "../store/useAppStore";
import { useSearchHistoryStore } from "../store/useSearchHistoryStore";

// per-profile data lives at {key}::{profileId}; before any profile is
// active the plain key is the fallback
function namespacedKey(key: string): string {
  const { activeProfileId } = useProfileStore.getState();
  return activeProfileId ? `${key}::${activeProfileId}` : key;
}

export function getItem(key: string): string | null {
  return localStorage.getItem(namespacedKey(key));
}

export function setItem(key: string, value: string): void {
  localStorage.setItem(namespacedKey(key), value);
}

export function removeItem(key: string): void {
  localStorage.removeItem(namespacedKey(key));
}

// a fresh profile has no namespaced record and zustand's rehydrate would
// keep the previous profile's in-memory data, so reset to the store defaults
export function rehydrateForActiveProfile(): void {
  const { activeProfileId } = useProfileStore.getState();
  if (!activeProfileId) {
    return;
  }
  if (localStorage.getItem(`cryonex-store::${activeProfileId}`) === null) {
    useAppStore.setState(useAppStore.getInitialState(), true);
  } else {
    void useAppStore.persist.rehydrate();
  }
  if (
    localStorage.getItem(`cryonex-search-history::${activeProfileId}`) === null
  ) {
    useSearchHistoryStore.setState(
      useSearchHistoryStore.getInitialState(),
      true,
    );
  } else {
    void useSearchHistoryStore.persist.rehydrate();
  }
}

export function switchProfile(id: string): void {
  useProfileStore.getState().setActiveProfile(id);
  rehydrateForActiveProfile();
}
