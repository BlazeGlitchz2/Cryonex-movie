import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Play, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMediaDetails } from "../../services/tmdb";
import { useAppStore } from "../../store/useAppStore";
import { useUIStore } from "../../store/useUIStore";
import type { MediaItem, MediaType } from "../../types/media";
import TmdbImage from "./TmdbImage";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const HOVER_QUERY = window.matchMedia("(hover: hover)");

// touch devices fire hover on tap; gate hover-only affordances so the modal owns taps
function useHoverPointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      HOVER_QUERY.addEventListener("change", onChange);
      return () => HOVER_QUERY.removeEventListener("change", onChange);
    },
    () => HOVER_QUERY.matches,
  );
}

export function buildWatchPath(
  mediaType: MediaType,
  id: number,
  season?: number | null,
  episode?: number | null,
): string {
  if (mediaType === "movie") {
    return `/watch/movie/${id}`;
  }
  return `/watch/tv/${id}?season=${season ?? 1}&episode=${episode ?? 1}`;
}

interface MediaCardProps {
  item: MediaItem;
  // rows keep the fixed width, grids pass w-full
  className?: string;
}

export function MediaCard({ item, className = "w-40 shrink-0" }: MediaCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const openDetail = useUIStore((state) => state.openDetail);
  const inWatchlist = useAppStore((state) =>
    state.isInWatchlist(item.id, item.mediaType),
  );
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist);
  const watchPath = buildWatchPath(item.mediaType, item.id);
  // cache-only subscription: fills in once the detail modal fetched this title
  const detailsQuery = useQuery({
    queryKey: ["details", item.mediaType, item.id],
    queryFn: () => fetchMediaDetails(item.mediaType, item.id),
    enabled: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const details = detailsQuery.data;
  const logo = details?.titleLogos[0];
  const metaParts = [
    item.releaseYear !== null ? String(item.releaseYear) : null,
    details
      ? details.genres.slice(0, 2).map((genre) => genre.name).join(" · ")
      : null,
  ].filter((part): part is string => part !== null);
  // info panel follows hover or keyboard focus inside the card
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hoverPointer = useHoverPointer();
  const panelOpen = hovered || focused;
  // hover or focus warms the detail cache so the modal opens with no skeleton pass
  const preloadDetails = () => {
    void queryClient.prefetchQuery({
      queryKey: ["details", item.mediaType, item.id],
      queryFn: () => fetchMediaDetails(item.mediaType, item.id),
      staleTime: 5 * 60_000,
    });
  };

  return (
    <motion.article
      className={`group relative ${className}`}
      onHoverStart={() => {
        if (!hoverPointer) return;
        setHovered(true);
        preloadDetails();
      }}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => {
        setFocused(true);
        preloadDetails();
      }}
      onBlur={(event) => {
        // focus moving between controls inside the card must not blink the panel
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
      whileHover={
        hoverPointer
          ? {
              y: -4,
              scale: 1.03,
              transition: { type: "spring", stiffness: 260, damping: 26 },
            }
          : undefined
      }
      whileTap={{ scale: 0.97, transition: { duration: 0.25, ease: EASE } }}
    >
      <motion.button
        type="button"
        layoutId={`title-${item.mediaType}-${item.id}`}
        onClick={() => openDetail({ id: item.id, mediaType: item.mediaType })}
        aria-label={`Open details for ${item.title}`}
        className="material-card relative block overflow-hidden rounded-card"
      >
        {item.posterPath ? (
          <TmdbImage
            path={item.posterPath}
            size="w500"
            alt=""
            width={500}
            height={750}
            className="touch-no-hover aspect-[2/3] w-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid aspect-[2/3] w-full place-items-center p-3 text-center">
            <span className="font-display text-sm leading-snug text-ink-dim">
              {item.title}
            </span>
          </div>
        )}
      </motion.button>
      <motion.div
        variants={{
          rest: { opacity: 0, y: 3 },
          open: {
            opacity: 1,
            y: 0,
            transition: {
              y: { duration: 0.35, ease: EASE },
              opacity: { type: "spring", stiffness: 260, damping: 26 },
            },
          },
        }}
        initial="rest"
        animate={panelOpen ? "open" : "rest"}
        className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end rounded-card bg-gradient-to-t from-canvas/95 via-canvas/45 to-transparent p-3"
      >
        {logo ? (
          <TmdbImage
            path={logo.filePath}
            size="w500"
            alt={item.title}
            className="max-h-10 w-auto max-w-[160px] object-contain drop-shadow-[0_2px_12px_rgba(7,8,10,0.6)]"
          />
        ) : (
          <p className="font-display text-sm font-semibold leading-snug text-ink">
            {item.title}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className="flex items-center gap-1 font-semibold text-emerald">
            <Star size={12} aria-hidden="true" />
            {item.voteAverage.toFixed(1)}
          </span>
          {metaParts.length > 0 && (
            <span className="text-ink-dim">{metaParts.join(" · ")}</span>
          )}
        </p>
        <div className="pointer-events-none mt-2 flex items-center gap-2 group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() => navigate(watchPath)}
            className="grid size-10 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink transition-colors duration-250 ease-in-out hover:border-white"
            aria-label={`Play ${item.title}`}
          >
            <Play size={20} aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() =>
              toggleWatchlist({
                id: item.id,
                mediaType: item.mediaType,
                title: item.title,
                overview: item.overview,
                posterPath: item.posterPath,
                backdropPath: item.backdropPath,
                voteAverage: item.voteAverage,
                releaseYear: item.releaseYear,
              })
            }
            className="grid size-10 place-items-center rounded-full border-2 border-white/50 bg-white/5 text-ink transition-colors duration-250 ease-in-out hover:border-white"
            aria-label={
              inWatchlist
                ? `Remove ${item.title} from watchlist`
                : `Add ${item.title} to watchlist`
            }
          >
            {inWatchlist ? (
              <Check size={20} aria-hidden="true" />
            ) : (
              <Plus size={20} aria-hidden="true" />
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.article>
  );
}

export default MediaCard;
