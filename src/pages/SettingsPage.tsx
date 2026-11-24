import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Server } from "lucide-react";
import { useRef } from "react";
import type { CSSProperties } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { DestructiveRow } from "../components/settings/DestructiveRow";
import Switch from "../components/settings/Switch";
import {
  AMBIENT_PRESETS,
  useAppearanceStore,
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
};

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
  const pushToast = useToastStore((state) => state.pushToast);
  const setSourcesOpen = useUIStore((state) => state.setSourcesOpen);

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
