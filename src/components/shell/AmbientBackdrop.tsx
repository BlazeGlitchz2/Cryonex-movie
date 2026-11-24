import type { CSSProperties } from "react";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import type { AmbientPreset } from "../../store/useAppearanceStore";

interface Blob {
  className: string;
  style: CSSProperties;
}

const EMERALD = "#2E9E4F";
const EMERALD_BRIGHT = "#46D369";
const WARM_WHITE = "#F5F5F7";
const AMBER = "#F5B50A";
const CRIMSON = "#E50914";

// every preset stays inside the design palette: emerald accent, warm
// white ink light, amber and crimson exist only as cinema marquee warmth
const PRESET_BLOBS: Record<Exclude<AmbientPreset, "off">, Blob[]> = {
  projector: [
    {
      className:
        "ambient-blob-a absolute -left-[8%] -top-[24%] h-[75vh] w-[55vw] rounded-full opacity-[0.12] blur-[110px]",
      style: {
        background: `radial-gradient(circle at 40% 40%, ${EMERALD}, transparent 70%)`,
      },
    },
    {
      className:
        "ambient-blob-b absolute right-[-12%] top-[8%] h-[65vh] w-[45vw] rounded-full opacity-[0.07] blur-[120px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${WARM_WHITE}, transparent 70%)`,
      },
    },
    {
      className:
        "ambient-blob-c absolute bottom-[-30%] left-[18%] h-[70vh] w-[50vw] rounded-full opacity-[0.09] blur-[110px]",
      style: {
        background: `radial-gradient(circle at 45% 55%, ${EMERALD}, transparent 72%)`,
      },
    },
  ],
  aurora: [
    {
      className:
        "ambient-ribbon-a absolute -left-[15%] -top-[30%] h-[160vh] w-[34vw] rounded-full opacity-[0.10] blur-[130px]",
      style: {
        background: `linear-gradient(200deg, ${EMERALD_BRIGHT}, ${EMERALD} 45%, transparent 78%)`,
      },
    },
    {
      className:
        "ambient-ribbon-b absolute -right-[12%] -top-[24%] h-[150vh] w-[28vw] rounded-full opacity-[0.07] blur-[140px]",
      style: {
        background: `linear-gradient(160deg, ${WARM_WHITE}, ${EMERALD} 55%, transparent 82%)`,
      },
    },
    {
      className:
        "ambient-blob-c absolute bottom-[-38%] left-[24%] h-[60vh] w-[46vw] rounded-full opacity-[0.06] blur-[130px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${EMERALD}, transparent 72%)`,
      },
    },
  ],
  ember: [
    {
      className:
        "ambient-ember-a absolute -left-[6%] bottom-[-32%] h-[80vh] w-[52vw] rounded-full opacity-[0.10] blur-[110px]",
      style: {
        background: `radial-gradient(circle at 45% 30%, ${AMBER}, transparent 70%)`,
      },
    },
    {
      className:
        "ambient-ember-b absolute right-[-10%] bottom-[-40%] h-[75vh] w-[46vw] rounded-full opacity-[0.09] blur-[120px]",
      style: {
        background: `radial-gradient(circle at 55% 45%, ${CRIMSON}, transparent 72%)`,
      },
    },
    {
      className:
        "ambient-blob-b absolute left-[30%] top-[6%] h-[45vh] w-[34vw] rounded-full opacity-[0.05] blur-[120px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${WARM_WHITE}, transparent 70%)`,
      },
    },
  ],
  spotlight: [
    {
      className:
        "ambient-beam-a absolute -left-[10%] -top-[30%] h-[130vh] w-[16vw] opacity-[0.09] blur-[70px]",
      style: {
        background: `linear-gradient(to bottom, ${WARM_WHITE}, transparent 72%)`,
      },
    },
    {
      className:
        "ambient-beam-b absolute right-[-8%] -top-[30%] h-[130vh] w-[14vw] opacity-[0.07] blur-[80px]",
      style: {
        background: `linear-gradient(to bottom, ${WARM_WHITE}, transparent 70%)`,
      },
    },
    {
      className:
        "ambient-blob-c absolute bottom-[-45%] left-[30%] h-[65vh] w-[40vw] rounded-full opacity-[0.06] blur-[130px]",
      style: {
        background: `radial-gradient(circle at 50% 50%, ${EMERALD}, transparent 72%)`,
      },
    },
  ],
};

// Desktop-only projector haze behind the window glass. Hidden below lg
// so phones and tablets never pay the large-blur GPU cost.
export function AmbientBackdrop() {
  const ambientBackdrop = useAppearanceStore((state) => state.ambientBackdrop);

  if (ambientBackdrop === "off") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
    >
      {PRESET_BLOBS[ambientBackdrop].map((blob, index) => (
        <div key={index} className={blob.className} style={blob.style} />
      ))}
    </div>
  );
}

export default AmbientBackdrop;
