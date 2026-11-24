import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { searchMulti } from "../../services/tmdb";
import { useSearchHistoryStore } from "../../store/useSearchHistoryStore";
import { useUIStore } from "../../store/useUIStore";
import type { MediaItem } from "../../types/media";
import TmdbImage from "../shared/TmdbImage";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// AppShell owns the same query; matching it keeps one nav/chrome breakpoint contract
const DESKTOP_QUERY = window.matchMedia("(min-width: 1024px)");

function subscribeDesktop(onChange: () => void) {
  DESKTOP_QUERY.addEventListener("change", onChange);
  return () => DESKTOP_QUERY.removeEventListener("change", onChange);
}

const rowList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const rowItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
};

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-ctl border border-hairline bg-surface px-1.5 py-0.5 text-[10px] leading-none text-ink">
      {children}
    </kbd>
  );
}

function PosterThumb({ item }: { item: MediaItem }) {
  const letter = item.title.charAt(0).toUpperCase();
  if (!item.posterPath) {
    return (
      <div
        aria-hidden="true"
        className="flex h-14 w-9 shrink-0 items-center justify-center rounded-ctl border border-hairline bg-surface-2 font-display text-lg text-ink-dim"
      >
        {letter}
      </div>
    );
  }
  return (
    <TmdbImage
      // tmdb.ts exposes no thumb size; w500 is the smallest allowed.
      path={item.posterPath}
      size="w500"
      alt=""
      width={36}
      height={56}
      className="h-14 w-9 shrink-0 rounded-ctl border border-hairline object-cover"
    />
  );
}

function ResultRow({
  item,
  index,
  active,
  onSelect,
}: {
  item: MediaItem;
  index: number;
  active: boolean;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <motion.button
      type="button"
      data-index={index}
      variants={rowItem}
      onClick={() => onSelect(item)}
      className="relative flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-2"
    >
      {active && (
        <motion.span
          layoutId="palette-active"
          aria-hidden="true"
          transition={{ duration: 0.4, ease: EASE }}
          className="absolute inset-0 bg-surface-2"
        />
      )}
      <span className="relative flex min-w-0 flex-1 items-center gap-3">
        <PosterThumb item={item} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold text-ink">
            {item.title}
          </span>
          {item.releaseYear !== null && (
            <span className="block text-xs text-ink-dim">
              {item.releaseYear}
            </span>
          )}
        </span>
      </span>
      <span className="relative rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-dim">
        {item.mediaType === "movie" ? "Movie" : "Series"}
      </span>
      {item.voteAverage > 0 && (
        <span className="relative text-xs text-ink-dim">
          {item.voteAverage.toFixed(1)}
        </span>
      )}
    </motion.button>
  );
}

function RecentSection({
  recent,
  onPick,
  onRemove,
  onClear,
}: {
  recent: string[];
  onPick: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between px-4">
        <span className="text-xs text-ink-dim">Recent searches</span>
        {recent.length > 1 && (
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-11 items-center px-1 text-xs text-ink-dim transition-colors duration-[250ms] ease-in-out hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
      <motion.div
        variants={rowList}
        initial="hidden"
        animate="show"
        className="mt-2 flex flex-wrap gap-2 px-4"
      >
        {recent.map((query) => (
          <motion.span
            key={query}
            variants={rowItem}
            className="flex items-center overflow-hidden rounded-full bg-white/[0.07] transition-colors duration-[250ms] ease-in-out hover:bg-white/[0.15]"
          >
            <button
              type="button"
              onClick={() => onPick(query)}
              className="max-w-40 truncate px-2.5 py-1 text-left text-xs text-ink max-lg:min-h-11"
            >
              {query}
            </button>
            <button
              type="button"
              aria-label={`Remove ${query} from recent searches`}
              onClick={() => onRemove(query)}
              className="border-l border-hairline px-1.5 py-1 text-ink-dim transition-colors duration-[250ms] ease-in-out hover:text-ink max-lg:min-h-11 max-lg:min-w-11 max-lg:px-2"
            >
              <X size={11} aria-hidden="true" />
            </button>
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

function PalettePanel({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => DESKTOP_QUERY.matches,
  );

  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const openDetail = useUIStore((state) => state.openDetail);
  const recent = useSearchHistoryStore((state) => state.recent);
  const addRecent = useSearchHistoryStore((state) => state.addRecent);
  const removeRecent = useSearchHistoryStore((state) => state.removeRecent);
  const clearRecent = useSearchHistoryStore((state) => state.clearRecent);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(raw);
      setActiveIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [raw]);

  const trimmed = query.trim();
  const inputEmpty = raw.trim().length === 0;
  const { data: results, isLoading, error } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchMulti(query),
    enabled: trimmed.length > 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // only queries that returned results earn a place in history
    if (results && results.length > 0) {
      addRecent(trimmed);
    }
  }, [results, trimmed, addRecent]);

  const go = useCallback(
    (item: MediaItem) => {
      // openDetail closes the palette itself and opens the detail modal
      openDetail({ id: item.id, mediaType: item.mediaType });
    },
    [openDetail],
  );

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // the shell owns scrolling, so lock the canvas scroller, not the body
    const canvas = document.getElementById("canvas-scroll");
    const previousOverflow = canvas?.style.overflow ?? "";
    if (canvas) {
      canvas.style.overflow = "hidden";
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (canvas) {
        canvas.style.overflow = previousOverflow;
      }
      previouslyFocused?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results]);

  const items = results ?? [];

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) =>
        Math.min(Math.max(index + delta, 0), items.length - 1),
      );
      return;
    }
    if (event.key === "Enter") {
      // Rows are real buttons and activate on Enter natively; the input drives the active index.
      if (document.activeElement !== inputRef.current) {
        return;
      }
      const item = items[activeIndex];
      if (!item) {
        return;
      }
      event.preventDefault();
      go(item);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const focusables = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          "button, input, select, [href]",
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) {
        return;
      }
      const current = focusables.indexOf(
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : focusables[0],
      );
      const next = event.shiftKey
        ? current <= 0
          ? focusables.length - 1
          : current - 1
        : current === -1 || current === focusables.length - 1
          ? 0
          : current + 1;
      focusables[next]?.focus();
    }
  };

  let resultsContent: ReactNode;
  if (inputEmpty && recent.length > 0) {
    resultsContent = (
      <RecentSection
        recent={recent}
        onPick={(picked) => {
          setRaw(picked);
          inputRef.current?.focus();
        }}
        onRemove={removeRecent}
        onClear={clearRecent}
      />
    );
  } else if (trimmed.length < 2) {
    resultsContent = (
      <div className="flex items-center gap-3 px-4 py-6 text-sm text-ink-dim">
        <Search size={16} aria-hidden="true" />
        Type to search movies and series
      </div>
    );
  } else if (isLoading) {
    resultsContent = (
      <div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4">
            <div className="shimmer h-14 w-9 rounded-ctl" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-4 w-2/5 rounded" />
              <div className="shimmer h-3 w-1/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (error) {
    resultsContent = (
      <div className="px-4 py-6">
        <p className="text-sm text-ink">Search failed.</p>
        <p className="mt-1 text-sm text-ink-dim">
          {error instanceof Error
            ? error.message
            : "Something went wrong while searching TMDB."}
        </p>
      </div>
    );
  } else if (items.length === 0) {
    resultsContent = (
      <div className="px-4 py-6 text-sm text-ink-dim">
        <p className="text-ink">No results for {query}.</p>
        <p className="mt-1">Try another title.</p>
      </div>
    );
  } else {
    resultsContent = (
      <motion.div
        key={trimmed}
        variants={rowList}
        initial="hidden"
        animate="show"
      >
        {items.map((item, index) => (
          <ResultRow
            key={`${item.mediaType}-${item.id}`}
            item={item}
            index={index}
            active={index === activeIndex}
            onSelect={go}
          />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md lg:items-start lg:pt-[18vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="material-modal w-full overflow-hidden rounded-t-[24px] pb-[env(safe-area-inset-bottom,0px)] lg:w-[640px] lg:max-w-[calc(100vw-3rem)] lg:rounded-[24px] lg:pb-0"
        // below lg the sheet rises from the bottom edge; desktop keeps its scale-settle
        initial={{ opacity: 0, ...(isDesktop ? { scale: 0.96 } : { y: 56 }) }}
        animate={{
          opacity: 1,
          ...(isDesktop
            ? {
                // 2% overshoot on settle, one gentle keyframe pass, no bounce
                scale: [0.96, 1.008, 1],
                transition: { duration: 0.55, ease: EASE, times: [0, 0.7, 1] },
              }
            : {
                y: 0,
                transition: { duration: 0.55, ease: EASE },
              }),
        }}
        exit={{
          opacity: 0,
          ...(isDesktop ? { scale: 0.96 } : { y: 56 }),
          transition: { duration: 0.3, ease: EASE },
        }}
        onKeyDown={onPanelKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <Search size={16} aria-hidden="true" className="text-ink-dim" />
          <label htmlFor="command-search" className="sr-only">
            Search movies and series
          </label>
          <input
            id="command-search"
            ref={inputRef}
            type="text"
            autoFocus
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Search movies and series"
            // iOS zooms any focused input under 16px, so touch keeps 16px text in a 44px field
            className="w-full bg-transparent py-3.5 text-sm text-ink placeholder:text-ink-dim max-lg:min-h-11 max-lg:text-base"
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto overscroll-contain"
        >
          {resultsContent}
        </div>
        {/* key caps are a desktop legend; touch has no keyboard to advertise */}
        <div className="hidden items-center justify-end gap-4 border-t border-hairline px-4 py-2.5 text-xs text-ink-dim lg:flex">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd> to open
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CommandPalette() {
  const commandOpen = useUIStore((state) => state.commandOpen);
  const setCommandOpen = useUIStore((state) => state.setCommandOpen);

  const close = useCallback(() => setCommandOpen(false), [setCommandOpen]);

  useKeyboardShortcut("mod+k", () => setCommandOpen(!commandOpen));

  return (
    <AnimatePresence>
      {commandOpen && <PalettePanel key="command-palette" onClose={close} />}
    </AnimatePresence>
  );
}
