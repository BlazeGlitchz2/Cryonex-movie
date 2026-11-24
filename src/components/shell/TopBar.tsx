import { Check, ChevronDown, ChevronRight, Pencil, Settings2, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import {
  GUEST_ID,
  PROFILE_HEX,
  profileInitial,
  profileInitialInk,
  useProfileStore,
} from "../../store/useProfileStore";
import { useToastStore } from "../../store/useToastStore";
import { useUIStore } from "../../store/useUIStore";
import { switchProfile } from "../../services/profileStorage";

const SECTION_BY_PATH: Record<string, string> = {
  "/": "Featured Spotlight",
  "/new": "New & Popular",
  "/series": "TV Shows",
  "/movies": "Movies",
  "/my-list": "My List",
  "/continue": "Continue Watching",
};

function sectionFor(pathname: string): string {
  if (SECTION_BY_PATH[pathname]) {
    return SECTION_BY_PATH[pathname];
  }
  if (pathname.startsWith("/watch/")) {
    return "Theater";
  }
  return "Cryonex";
}

function sectionLabelFor(pathname: string): string | null {
  if (SECTION_BY_PATH[pathname]) {
    return SECTION_BY_PATH[pathname];
  }
  if (pathname.startsWith("/watch/")) {
    return "Theater";
  }
  return null;
}

export function TopBar() {
  const { pathname } = useLocation();
  const providers = useAppStore((state) => state.providers);
  const activeProviderId = useAppStore((state) => state.activeProviderId);
  const setActiveProvider = useAppStore((state) => state.setActiveProvider);
  const setSourcesOpen = useUIStore((state) => state.setSourcesOpen);

  const profiles = useProfileStore((state) => state.profiles);
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const setManageOpen = useProfileStore((state) => state.setManageOpen);
  const ensureGuestProfile = useProfileStore(
    (state) => state.ensureGuestProfile,
  );
  const pushToast = useToastStore((state) => state.pushToast);
  const activeProfile = profiles.find(
    (profile) => profile.id === activeProfileId,
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  const enabled = providers.filter((provider) => provider.enabled);
  const active = enabled.find((provider) => provider.id === activeProviderId);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileMenuOpen]);

  const sectionLabel = sectionLabelFor(pathname);

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-hairline px-4 lg:px-8">
      <h1 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold leading-none text-ink lg:text-[18px]">
        {activeProfile ? (
          <>
            <span className="truncate font-display">
              Welcome, {activeProfile.name}
            </span>
            {sectionLabel && (
              <>
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="hidden text-ink-dim min-[420px]:block"
                />
                <span className="hidden text-sm font-normal text-ink-dim min-[420px]:inline">
                  {sectionLabel}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="truncate font-display">{sectionFor(pathname)}</span>
        )}
      </h1>

      <div className="flex shrink-0 items-center gap-3">
        <div className="relative hidden lg:block">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex min-h-9 items-center gap-2 rounded-full border border-hairline bg-white/[0.06] px-3.5 py-1.5 text-sm transition-colors duration-250 ease-in-out hover:border-white/15 hover:bg-white/[0.09]"
          >
            {active ? (
              <span
                // emerald dot marks a real enabled server, not a health claim
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-emerald"
              />
            ) : (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-white/20"
              />
            )}
            <span className="font-medium text-ink">
              {active ? active.name : "No server"}
            </span>
            {active?.badge && (
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-ink-dim">
                {active.badge}
              </span>
            )}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`text-ink-dim transition-transform duration-250 ease-in-out ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="menu"
                aria-label="Switch server"
                className="material-modal absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-hero p-1.5"
              >
                {enabled.length === 0 && (
                  <p className="px-3 py-2.5 text-sm text-ink-dim">
                    No servers enabled. Turn one on in Manage sources.
                  </p>
                )}
                {enabled.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={provider.id === activeProviderId}
                    onClick={() => {
                      setActiveProvider(provider.id);
                      setMenuOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={`flex min-h-10 w-full items-center gap-2 rounded-ctl px-3 text-sm transition-colors duration-250 ease-in-out ${
                      provider.id === activeProviderId
                        ? "bg-white/[0.08] text-ink"
                        : "text-ink-dim hover:bg-white/[0.05] hover:text-ink"
                    }`}
                  >
                    <span className="flex-1 text-left">{provider.name}</span>
                    {provider.badge && (
                      <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-ink-dim">
                        {provider.badge}
                      </span>
                    )}
                    {provider.id === activeProviderId && (
                      <Check size={14} aria-hidden="true" className="text-emerald" />
                    )}
                  </button>
                ))}
                <div className="my-1 h-px bg-hairline" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setSourcesOpen(true);
                  }}
                  className="flex min-h-10 w-full items-center gap-2 rounded-ctl px-3 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:bg-white/[0.05] hover:text-ink"
                >
                  <Settings2 size={15} aria-hidden="true" />
                  Manage sources
                </button>
              </div>
            </>
          )}
        </div>

        {activeProfile && (
          <div className="relative">
            <button
              ref={profileTriggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-label={`Profiles for ${activeProfile.name}`}
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="grid size-8 max-lg:size-11 place-items-center rounded-[10px] border-2 border-transparent font-display text-sm font-bold transition-colors duration-250 ease-in-out hover:border-white"
              style={{
                backgroundColor: PROFILE_HEX[activeProfile.color],
                color: profileInitialInk(activeProfile.color),
              }}
            >
              {profileInitial(activeProfile.name)}
            </button>

            {profileMenuOpen && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => setProfileMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div
                  role="menu"
                  aria-label="Switch profile"
                  className="material-modal absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-hero p-1.5"
                >
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={profile.id === activeProfileId}
                      onClick={() => {
                        switchProfile(profile.id);
                        setProfileMenuOpen(false);
                        profileTriggerRef.current?.focus();
                      }}
                      className={`flex min-h-10 w-full items-center gap-2.5 rounded-ctl px-3 text-sm transition-colors duration-250 ease-in-out ${
                        profile.id === activeProfileId
                          ? "bg-white/[0.08] text-ink"
                          : "text-ink-dim hover:bg-white/[0.05] hover:text-ink"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-6 shrink-0 place-items-center rounded-md font-display text-[10px] font-bold"
                        style={{
                          backgroundColor: PROFILE_HEX[profile.color],
                          color: profileInitialInk(profile.color),
                        }}
                      >
                        {profileInitial(profile.name)}
                      </span>
                      <span className="flex-1 text-left">{profile.name}</span>
                      {profile.id === activeProfileId && (
                        <Check size={14} aria-hidden="true" className="text-ink" />
                      )}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-hairline" aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setManageOpen(true);
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-ctl px-3 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:bg-white/[0.05] hover:text-ink"
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Manage profiles
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      ensureGuestProfile();
                      switchProfile(GUEST_ID);
                      setProfileMenuOpen(false);
                      pushToast({ title: "Watching as Guest" });
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-ctl px-3 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:bg-white/[0.05] hover:text-ink"
                  >
                    <UserRound size={15} aria-hidden="true" />
                    Continue as guest
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;
