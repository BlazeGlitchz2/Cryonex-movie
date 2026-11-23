import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

interface TheaterPlayerProps {
  src: string;
  frameTitle: string;
  ambientColor: string | null;
  dimmed: boolean;
}

export default function TheaterPlayer({
  src,
  frameTitle,
  ambientColor,
  dimmed,
}: TheaterPlayerProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  return (
    <div className="relative">
      <AnimatePresence>
        {ambientColor && (
          <motion.div
            key={ambientColor}
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-24 -top-16 bottom-0 -z-10"
            style={{
              background: `radial-gradient(55% 55% at 50% 35%, ${ambientColor} 0%, transparent 70%)`,
              filter: "blur(120px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: dimmed ? 0.02 : 0.18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        )}
      </AnimatePresence>
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.65, ease: EASE }}
        className="relative aspect-video w-full overflow-hidden rounded-hero border border-rim bg-canvas shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)]"
      >
        {/* the screen is the one elevated object in a dark room, the only surface allowed a shadow */}
        {loadedSrc !== src && (
          <div className="shimmer absolute inset-0" aria-hidden="true" />
        )}
        <AnimatePresence initial={false}>
          <motion.div
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.45, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: EASE } }}
            className="absolute inset-0"
          >
            {/* sandbox keeps scripts/HLS working while forbidding popups,
                top-level redirects, and modal ad traps that embeds attempt */}
            <iframe
              src={src}
              title={frameTitle}
              referrerPolicy="no-referrer"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              onLoad={() => setLoadedSrc(src)}
              className="h-full w-full border-0"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
