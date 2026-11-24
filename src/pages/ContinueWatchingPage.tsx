import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { buildWatchPath } from "../components/shared/MediaCard";
import TmdbImage from "../components/shared/TmdbImage";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function ContinueWatchingPage() {
  const entries = useAppStore((state) => state.continueWatching);
  const removeFromContinueWatching = useAppStore(
    (state) => state.removeFromContinueWatching,
  );
  const navigate = useNavigate();

  return (
    <div className="px-8 pb-10 pt-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">
        Continue Watching
      </h1>

      {entries.length === 0 && (
        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-dim">
          Nothing in progress yet. Play anything and it will appear here with
          resume controls.
        </p>
      )}

      {entries.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry, index) => {
            const subtitle =
              entry.mediaType === "tv" &&
              entry.season !== null &&
              entry.episode !== null
                ? `S${entry.season} E${entry.episode}`
                : "Movie";
            return (
              <motion.article
                key={`${entry.mediaType}-${entry.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index, 8) * 0.08,
                  duration: 0.4,
                  ease: EASE,
                }}
                className="group relative"
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
                  <div className="relative aspect-video w-full bg-surface-2">
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
                      <div className="h-full w-full" aria-hidden="true" />
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
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-base font-semibold text-ink">
                        {entry.title}
                      </p>
                      <span className="mt-1.5 inline-block rounded-full border border-hairline bg-canvas/70 px-2 py-0.5 text-xs text-ink-dim">
                        {subtitle}
                      </span>
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
                  className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink-dim opacity-0 transition duration-250 ease-in-out hover:border-white hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
                  aria-label={`Remove ${entry.title} from continue watching`}
                >
                  <X size={20} aria-hidden="true" />
                </motion.button>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ContinueWatchingPage;
