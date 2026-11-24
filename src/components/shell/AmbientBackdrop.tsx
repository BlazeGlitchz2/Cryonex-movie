import { useEffect, useState } from "react";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import type { AmbientPreset } from "../../store/useAppearanceStore";
import { WALLPAPER_KEY } from "../../store/useAppearanceStore";

interface Blob {
  className: string;
  style: React.CSSProperties;
  // base opacity; the intensity slider multiplies it (0.5x to 1.8x).
  // inline, because CSS opacity caps at 1 and the layer wrapper cannot carry it
  base: number;
}

const EMERALD = "#2E9E4F";
const EMERALD_BRIGHT = "#46D369";
const WARM_WHITE = "#F5F5F7";
const AMBER = "#F5B50A";
const CRIMSON = "#E50914";

// owner feedback: the presets must be visible, not a whisper
const PRESET_BLOBS: Record<
  Exclude<AmbientPreset, "off" | "custom">,
  Blob[]
> = {
  projector: [
    {
      className:
        "ambient-blob-a absolute -left-[8%] -top-[24%] h-[75vh] w-[55vw] rounded-full blur-[110px]",
      style: {
        background: `radial-gradient(circle at 40% 40%, ${EMERALD_BRIGHT}, ${EMERALD} 60%, transparent 72%)`,
      },
      base: 0.22,
    },
    {
      className:
        "ambient-blob-b absolute right-[-12%] top-[8%] h-[65vh] w-[45vw] rounded-full blur-[120px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${WARM_WHITE}, transparent 70%)`,
      },
      base: 0.13,
    },
    {
      className:
        "ambient-blob-c absolute bottom-[-30%] left-[18%] h-[70vh] w-[50vw] rounded-full blur-[110px]",
      style: {
        background: `radial-gradient(circle at 45% 55%, ${EMERALD}, transparent 72%)`,
      },
      base: 0.17,
    },
  ],
  aurora: [
    {
      className:
        "ambient-ribbon-a absolute -left-[15%] -top-[30%] h-[160vh] w-[34vw] rounded-full blur-[130px]",
      style: {
        background: `linear-gradient(200deg, ${EMERALD_BRIGHT}, ${EMERALD} 45%, transparent 78%)`,
      },
      base: 0.22,
    },
    {
      className:
        "ambient-ribbon-b absolute -right-[12%] -top-[24%] h-[150vh] w-[28vw] rounded-full blur-[140px]",
      style: {
        background: `linear-gradient(160deg, ${WARM_WHITE}, ${EMERALD} 55%, transparent 82%)`,
      },
      base: 0.15,
    },
    {
      className:
        "ambient-blob-c absolute bottom-[-38%] left-[24%] h-[60vh] w-[46vw] rounded-full blur-[130px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${EMERALD}, transparent 72%)`,
      },
      base: 0.13,
    },
  ],
  ember: [
    {
      className:
        "ambient-ember-a absolute -left-[6%] bottom-[-32%] h-[80vh] w-[52vw] rounded-full blur-[110px]",
      style: {
        background: `radial-gradient(circle at 45% 30%, ${AMBER}, ${CRIMSON} 60%, transparent 72%)`,
      },
      base: 0.22,
    },
    {
      className:
        "ambient-ember-b absolute right-[-10%] bottom-[-40%] h-[75vh] w-[46vw] rounded-full blur-[120px]",
      style: {
        background: `radial-gradient(circle at 55% 45%, ${CRIMSON}, transparent 72%)`,
      },
      base: 0.19,
    },
    {
      className:
        "ambient-blob-b absolute left-[30%] top-[6%] h-[45vh] w-[34vw] rounded-full blur-[120px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${AMBER}, transparent 70%)`,
      },
      base: 0.11,
    },
  ],
  spotlight: [
    {
      className:
        "ambient-beam-a absolute -left-[10%] -top-[30%] h-[130vh] w-[16vw] blur-[70px]",
      style: {
        background: `linear-gradient(to bottom, ${WARM_WHITE}, transparent 72%)`,
      },
      base: 0.17,
    },
    {
      className:
        "ambient-beam-b absolute right-[-8%] -top-[30%] h-[130vh] w-[14vw] blur-[80px]",
      style: {
        background: `linear-gradient(to bottom, ${WARM_WHITE}, transparent 70%)`,
      },
      base: 0.14,
    },
    {
      className:
        "ambient-blob-c absolute bottom-[-45%] left-[30%] h-[65vh] w-[40vw] rounded-full blur-[130px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${EMERALD}, transparent 72%)`,
      },
      base: 0.13,
    },
  ],
  gradient: [
    {
      // oversized sheet translating on x: the whole window becomes a slow
      // cinema gradient, transform-only so it stays cheap
      className:
        "ambient-gradient absolute -left-[70%] -top-[10%] h-[120vh] w-[240vw] blur-[40px]",
      style: {
        background: `linear-gradient(115deg, #121312 0%, ${EMERALD} 28%, ${EMERALD_BRIGHT} 46%, ${WARM_WHITE} 62%, ${EMERALD} 78%, #121312 100%)`,
      },
      base: 0.32,
    },
  ],
};

function useWallpaper(): string | null {
  const [wallpaper, setWallpaper] = useState<string | null>(() => {
    try {
      return localStorage.getItem(WALLPAPER_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    // cross-tab and same-tab updates from the Settings picker
    const onStorage = () => {
      try {
        setWallpaper(localStorage.getItem(WALLPAPER_KEY));
      } catch {
        setWallpaper(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return wallpaper;
}

// Desktop-only projector haze behind the window glass. Hidden below lg
// so phones and tablets never pay the large-blur GPU cost.
export function AmbientBackdrop() {
  const ambientBackdrop = useAppearanceStore((state) => state.ambientBackdrop);
  const ambientIntensity = useAppearanceStore(
    (state) => state.ambientIntensity,
  );
  const wallpaper = useWallpaper();

  if (ambientBackdrop === "off") {
    return null;
  }

  // intensity 0-100 maps to a 0.5x..1.8x light multiplier
  const k = 0.5 + (ambientIntensity / 100) * 1.3;

  if (ambientBackdrop === "custom") {
    if (!wallpaper) {
      return null;
    }
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
      >
        <img
          src={wallpaper}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: Math.min(k, 1) }}
        />
        {/* scrim keeps text over the wallpaper readable */}
        <div className="absolute inset-0 bg-canvas/45" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(18,19,18,0.6), transparent 60%)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
    >
      {PRESET_BLOBS[ambientBackdrop].map((blob, index) => (
        <div
          key={index}
          className={blob.className}
          style={{ ...blob.style, opacity: Math.min(blob.base * k, 1) }}
        />
      ))}
    </div>
  );
}

export default AmbientBackdrop;
