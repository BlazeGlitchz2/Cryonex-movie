import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { MediaCard } from "../components/shared/MediaCard";
import { useAppStore } from "../store/useAppStore";
import type { MediaItem, WatchlistEntry } from "../types/media";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

type SortMode = "recent" | "title" | "rating";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "recent", label: "Recently added" },
  { id: "title", label: "Title A-Z" },
  { id: "rating", label: "Rating" },
];

const toMediaItem = (entry: WatchlistEntry): MediaItem => ({
  id: entry.id,
  mediaType: entry.mediaType,
  title: entry.title,
  overview: entry.overview,
  posterPath: entry.posterPath,
  backdropPath: entry.backdropPath,
  voteAverage: entry.voteAverage,
  releaseYear: entry.releaseYear,
  genreIds: [],
});

function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  const buttonsRef = useRef(new Map<SortMode, HTMLButtonElement>());

  const move = (direction: 1 | -1) => {
    const index = SORT_OPTIONS.findIndex((option) => option.id === value);
    const next =
      SORT_OPTIONS[
        (index + direction + SORT_OPTIONS.length) % SORT_OPTIONS.length
      ];
    onChange(next.id);
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
      aria-label="Sort my list"
      onKeyDown={onKeyDown}
      className="material-card flex rounded-ctl p-0.5"
    >
      {SORT_OPTIONS.map((option) => {
        const active = option.id === value;
        return (
          <motion.button
            key={option.id}
            ref={(el) => {
              if (el) {
                buttonsRef.current.set(option.id, el);
              } else {
                buttonsRef.current.delete(option.id);
              }
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() => onChange(option.id)}
            className="relative rounded-ctl px-3 py-1.5 text-xs transition-colors duration-250 ease-in-out max-lg:min-h-11 max-lg:px-4 max-lg:text-sm"
          >
            {active && (
              <motion.span
                layoutId="mylist-sort-active"
                aria-hidden="true"
                transition={{ type: "spring", stiffness: 180, damping: 24 }}
                className="absolute inset-0 rounded-ctl bg-surface-2"
              />
            )}
            <span
              className={`relative ${active ? "text-ink" : "text-ink-dim"}`}
            >
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function MyListPage() {
  const watchlist = useAppStore((state) => state.watchlist);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const sorted = useMemo(() => {
    const list = [...watchlist];
    if (sortMode === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === "rating") {
      list.sort((a, b) => b.voteAverage - a.voteAverage);
    } else {
      list.sort((a, b) => b.addedAt - a.addedAt);
    }
    return list;
  }, [watchlist, sortMode]);

  return (
    <div className="px-8 pb-10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-extrabold text-ink">
            My List
          </h1>
          {watchlist.length > 0 && (
            <span className="text-sm text-ink-dim">
              {watchlist.length} titles
            </span>
          )}
        </div>
        {watchlist.length > 0 && (
          <SortControl value={sortMode} onChange={setSortMode} />
        )}
      </div>
      {watchlist.length === 0 ? (
        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-dim">
          Nothing saved yet. Press + on any title to keep it here.
        </p>
      ) : (
        <div className="mt-8 flex flex-wrap gap-4">
          {sorted.map((entry) => (
            <motion.div
              key={`${entry.mediaType}-${entry.id}`}
              layout
              transition={{ layout: { duration: 0.45, ease: EASE } }}
              className="shrink-0"
            >
              <MediaCard item={toMediaItem(entry)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyListPage;
