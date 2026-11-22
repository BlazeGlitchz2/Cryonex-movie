import { ChevronRight, Play, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { buildWatchPath } from "../shared/MediaCard";
import TmdbImage from "../shared/TmdbImage";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function ContinueWatchingRow() {
  const entries = useAppStore((state) => state.continueWatching);
  const removeFromContinueWatching = useAppStore(
    (state) => state.removeFromContinueWatching,
  );
  const navigate = useNavigate();

  if (entries.length === 0) return null;

  return (
    <section>
      <h2 className="flex items-center gap-1 font-display text-lg font-semibold text-ink">
        Continue watching
        <ChevronRight size={16} aria-hidden="true" className="text-ink-dim" />
      </h2>
      <div className="mt-4 flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry, i) => (
          <motion.div
            key={`${entry.mediaType}-${entry.id}`}
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{
              delay: Math.min(i, 8) * 0.08,
              duration: 0.55,
              ease: EASE,
            }}
            className="group relative w-72 shrink-0"
          >
            <button
              type="button"
              onClick={() =>
                navigate(
                  buildWatchPath(
                    entry.mediaType,
                    entry.id,
                    entry.season,
                    entry.episode,
                  ),
                )
              }
              aria-label={`Continue ${entry.title}`}
              className="material-card block w-full overflow-hidden rounded-hero text-left"
            >
              <div className="relative aspect-video w-full">
                {entry.backdropPath ? (
                  <TmdbImage
                    path={entry.backdropPath}
                    size="w780"
                    alt=""
                    width={780}
                    height={439}
                    className="h-full w-full object-cover transition-transform duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
                  />
                ) : entry.posterPath ? (
                  <TmdbImage
                    path={entry.posterPath}
                    size="w500"
                    alt=""
                    width={500}
                    height={750}
                    className="h-full w-full object-cover transition-transform duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="h-full w-full bg-surface-2" />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-canvas/95 via-canvas/30 to-transparent"
                />
                <div className="absolute inset-0 grid place-items-center">
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink opacity-60 transition duration-250 ease-in-out group-hover:border-white group-hover:opacity-100"
                  >
                    <Play size={20} />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {entry.title}
                    </p>
                    {entry.season !== null && entry.episode !== null && (
                      <span className="mt-1 inline-block rounded-full border border-hairline bg-canvas/70 px-2 py-0.5 text-xs text-ink-dim">
                        S{entry.season} E{entry.episode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={() =>
                removeFromContinueWatching(entry.id, entry.mediaType)
              }
              className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink-dim opacity-0 transition duration-250 ease-in-out hover:border-white hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remove ${entry.title} from continue watching`}
            >
              <X size={20} aria-hidden="true" />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default ContinueWatchingRow;
