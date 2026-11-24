import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Server, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { DestructiveRow } from "../components/settings/DestructiveRow";
import Switch from "../components/settings/Switch";
import {
  AMBIENT_PRESETS,
  useAppearanceStore,
  WALLPAPER_KEY,
} from "../store/useAppearanceStore";
import type { AmbientPreset } from "../store/useAppearanceStore";
import { useAppStore } from "../store/useAppStore";
import { useToastStore } from "../store/useToastStore";
import { useUIStore } from "../store/useUIStore";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// swatch previews use the preset's own light, never a second palette
const PRESET_SWATCH: Record<AmbientPreset, CSSProperties> = {
  off: { background: "#161614" },
  projector: {
    background: "radial-gradient(circle at 38% 38%, #46D369, #161614 72%)",
  },
  aurora: {
    background:
      "linear-gradient(200deg, #46D369, #2E9E4F 45%, #f5f5f7 92%)",
  },
  ember: {
    background: "radial-gradient(circle at 60% 60%, #E50914, #F5B50A 85%)",
  },
  spotlight: {
    background:
      "linear-gradient(to bottom, #f5f5f7, rgba(245,245,247,0.15) 60%, #161614)",
  },
  gradient: {
    background:
      "linear-gradient(115deg, #121312, #2E9E4F 35%, #46D369 55%, #f5f5f7 80%)",
  },
  custom: {
    background:
      "linear-gradient(135deg, #161614 40%, #2E9E4F 60%, #f5f5f7 100%)",
  },
};

// wallpapers live as downscaled JPEG data URLs; raw phone photos would
// blow the localStorage budget, so big files come down to 1600px wide
async function downscaleToDataUrl(file: File): Promise<string | null> {
  const original = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  if (!original) {
    return null;
  }
  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = original;
  });
  if (!image) {
    return null;
  }
  const maxW = 1600;
  const scale = Math.min(1, maxW / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={rise}
      className="material-card rounded-hero p-5 max-lg:p-4"
    >
      <h2 className="font-display text-sm font-semibold text-ink">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

function AppearanceRow({
  title,
  description,
  checked,
  label,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-dim">{description}</p>
      </div>
      <Switch checked={checked} label={label} onToggle={onToggle} />
    </div>
  );
}

function BackdropPicker() {
  const ambientBackdrop = useAppearanceStore(
    (state) => state.ambientBackdrop,
  );
  const setAmbientBackdrop = useAppearanceStore(
    (state) => state.setAmbientBackdrop,
  );
  const buttonsRef = useRef(new Map<AmbientPreset, HTMLButtonElement>());

  const move = (direction: 1 | -1) => {
    const index = AMBIENT_PRESETS.findIndex(
      (preset) => preset.id === ambientBackdrop,
    );
    const next =
      AMBIENT_PRESETS[
        (index + direction + AMBIENT_PRESETS.length) % AMBIENT_PRESETS.length
      ];
    setAmbientBackdrop(next.id);
    buttonsRef.current.get(next.id)?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Animated backdrop"
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {AMBIENT_PRESETS.map((preset) => {
        const active = preset.id === ambientBackdrop;
        return (
          <button
            key={preset.id}
            ref={(el) => {
              if (el) {
                buttonsRef.current.set(preset.id, el);
              } else {
                buttonsRef.current.delete(preset.id);
              }
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setAmbientBackdrop(preset.id)}
            className={`flex min-h-11 items-center gap-2.5 rounded-ctl border px-3.5 text-sm transition-colors duration-250 ease-in-out ${
              active
                ? "border-white/25 bg-white/[0.08] text-ink"
                : "border-hairline text-ink-dim hover:border-white/15 hover:text-ink"
            }`}
          >
            <span
              aria-hidden="true"
              className="size-6 shrink-0 rounded-md border border-hairline"
              style={PRESET_SWATCH[preset.id]}
            />
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsPage() {
  const glass = useAppearanceStore((state) => state.glass);
  const setGlass = useAppearanceStore((state) => state.setGlass);
  const windowGlass = useAppearanceStore((state) => state.windowGlass);
  const setWindowGlass = useAppearanceStore(
    (state) => state.setWindowGlass,
  );
  const ambientBackdrop = useAppearanceStore(
    (state) => state.ambientBackdrop,
  );
  const setAmbientBackdrop = useAppearanceStore(
    (state) => state.setAmbientBackdrop,
  );
  const ambientIntensity = useAppearanceStore(
    (state) => state.ambientIntensity,
  );
  const setAmbientIntensity = useAppearanceStore(
    (state) => state.setAmbientIntensity,
  );
  const compatibilityMode = useAppearanceStore(
    (state) => state.compatibilityMode,
  );
  const setCompatibilityMode = useAppearanceStore(
    (state) => state.setCompatibilityMode,
  );
  const pushToast = useToastStore((state) => state.pushToast);
  const setSourcesOpen = useUIStore((state) => state.setSourcesOpen);

  const [wallpaperSet, setWallpaperSet] = useState(() => {
    try {
      return localStorage.getItem(WALLPAPER_KEY) !== null;
    } catch {
      return false;
    }
  });

  const onWallpaperPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await downscaleToDataUrl(file);
    if (!dataUrl) {
      pushToast({ title: "Could not read that image." });
      return;
    }
    try {
      localStorage.setItem(WALLPAPER_KEY, dataUrl);
    } catch {
      pushToast({ title: "Image still too large, try a smaller one." });
      return;
    }
    // same-tab refresh; the backdrop listens for storage events
    window.dispatchEvent(new StorageEvent("storage"));
    setWallpaperSet(true);
    setAmbientBackdrop("custom");
    pushToast({ title: "Wallpaper set", tone: "success" });
    event.target.value = "";
  };

  const providers = useAppStore((state) => state.providers);
  const activeProviderId = useAppStore((state) => state.activeProviderId);
  const enabled = providers.filter((provider) => provider.enabled);
  const active = enabled.find((provider) => provider.id === activeProviderId);
  const watchlist = useAppStore((state) => state.watchlist);
  const continueWatching = useAppStore((state) => state.continueWatching);
  const removeFromWatchlist = useAppStore(
    (state) => state.removeFromWatchlist,
  );
  const removeFromContinueWatching = useAppStore(
    (state) => state.removeFromContinueWatching,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.h1
          variants={rise}
          className="font-display text-2xl font-extrabold text-ink"
        >
          Settings
        </motion.h1>

        <div className="mt-6 space-y-4">
          <SectionCard title="Appearance">
            <AppearanceRow
              title="Glass surfaces"
              description="Translucent frosted panels across the app"
              checked={glass}
              label="Glass surfaces"
              onToggle={() => {
                setGlass(!glass);
                pushToast({
                  title: !glass ? "Glass surfaces on" : "Glass surfaces off",
                });
              }}
            />
            <AppearanceRow
              title="Desktop window"
              description="The whole window turns frosted glass over your desktop"
              checked={windowGlass}
              label="Desktop window"
              onToggle={() => {
                setWindowGlass(!windowGlass);
                pushToast({
                  title: !windowGlass
                    ? "Desktop glass on"
                    : "Desktop glass off",
                });
              }}
            />
            <div className="border-t border-hairline py-4">
              <p className="text-sm text-ink">Animated backdrop</p>
              <p className="mt-0.5 text-xs text-ink-dim">
                Slow light drifts behind the window glass, desktop only
              </p>
              <div className="mt-3">
                <BackdropPicker />
              </div>
              {ambientBackdrop !== "off" && (
                <div className="mt-4">
                  <label
                    htmlFor="backdrop-intensity"
                    className="text-xs text-ink-dim"
                  >
                    Intensity, {ambientIntensity} of 100
                  </label>
                  <input
                    id="backdrop-intensity"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={ambientIntensity}
                    onChange={(event) =>
                      setAmbientIntensity(Number(event.target.value))
                    }
                    className="mt-2 h-11 w-full max-w-xs cursor-pointer accent-accent"
                  />
                </div>
              )}
              {ambientBackdrop === "custom" && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="wallpaper-file"
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-ctl border border-hairline px-4 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:border-white/15 hover:text-ink"
                  >
                    <Upload size={15} aria-hidden="true" />
                    Choose image
                  </label>
                  <input
                    id="wallpaper-file"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={onWallpaperPick}
                  />
                  {wallpaperSet && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem(WALLPAPER_KEY);
                        } catch {
                          // an unset key is the same as a missing one
                        }
                        window.dispatchEvent(
                          new StorageEvent("storage"),
                        );
                        setWallpaperSet(false);
                        pushToast({ title: "Wallpaper removed" });
                      }}
                      className="flex min-h-11 items-center gap-2 rounded-ctl border border-hairline px-4 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:border-white/15 hover:text-ink"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Remove
                    </button>
                  )}
                  <p className="w-full text-xs text-ink-dim">
                    Scaled to 1600px and kept on this device only.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Streaming sources">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-ink">
                  <Server size={14} aria-hidden="true" className="text-ink-dim" />
                  {active ? active.name : "No server"}
                </p>
                <p className="mt-0.5 text-xs text-ink-dim">
                  {enabled.length} of {providers.length} sources enabled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSourcesOpen(true)}
                className="rounded-ctl bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-colors duration-250 ease-in-out hover:bg-white/80 max-lg:min-h-11"
              >
                Manage sources
              </button>
            </div>
            <div className="mt-2 border-t border-hairline pt-2">
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink">Compatibility mode</p>
                  <p className="mt-0.5 text-xs text-ink-dim">
                    Some sources refuse to play with ad blocking or the
                    sandbox on. This turns both off everywhere.
                  </p>
                </div>
                <Switch
                  checked={compatibilityMode}
                  label="Compatibility mode"
                  onToggle={() => {
                    setCompatibilityMode(!compatibilityMode);
                    pushToast({
                      title: !compatibilityMode
                        ? "Compatibility mode on, ads possible"
                        : "Compatibility mode off",
                    });
                  }}
                />
              </div>
              <p className="text-xs leading-relaxed text-ink-dim">
                Per-source opt-out stays available in Manage sources, for
                keeping the rest protected.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Your data">
            <div className="divide-y divide-hairline">
              <DestructiveRow
                label="Clear continue watching"
                description={
                  continueWatching.length > 0
                    ? `${continueWatching.length} titles in progress.`
                    : "Nothing in progress."
                }
                disabled={continueWatching.length === 0}
                onConfirm={() => {
                  // only single-item removal exists in the store, loop is fine at personal scale
                  continueWatching.forEach((entry) =>
                    removeFromContinueWatching(entry.id, entry.mediaType),
                  );
                  pushToast({
                    title: "Continue watching cleared",
                    tone: "success",
                  });
                }}
              />
              <DestructiveRow
                label="Clear watchlist"
                description={
                  watchlist.length > 0
                    ? `${watchlist.length} titles saved.`
                    : "Nothing saved yet."
                }
                disabled={watchlist.length === 0}
                onConfirm={() => {
                  watchlist.forEach((entry) =>
                    removeFromWatchlist(entry.id, entry.mediaType),
                  );
                  pushToast({ title: "Watchlist cleared", tone: "success" });
                }}
              />
            </div>
          </SectionCard>

          <SectionCard title="About">
            <p className="text-sm leading-relaxed text-ink-dim">
              Cryonex plays TMDB titles through embed sources you control.
              Popups, redirects and ad networks are blocked inside every
              player frame by a native WebKit content blocker, and the
              sandbox stays on unless a source opts out.
            </p>
          </SectionCard>
        </div>
      </motion.div>
    </div>
  );
}

export default SettingsPage;
