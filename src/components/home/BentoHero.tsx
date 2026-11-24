import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Info, Play, Star } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAverageColor } from "../watch/useAverageColor";
import { useNavigate } from "react-router-dom";
import { fetchMediaDetails, tmdbImageUrl } from "../../services/tmdb";
import { useUIStore } from "../../store/useUIStore";
import type { MediaDetails, MediaItem } from "../../types/media";
import { buildWatchPath } from "../shared/MediaCard";
import { standardQueryOptions } from "../shared/MediaRow";
import TmdbImage from "../shared/TmdbImage";
import { retryImageElement } from "../../services/imageRetry";

// Motion v2 tokens from DESIGN.md: ambient crossfade 800ms, stage 700ms in
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const ROTATE_MS = 9000;
// phones get a taller full-width spotlight; lg keeps the bento height
const HERO_HEIGHT = "h-[440px] lg:h-[340px]";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// per-slide content block: crossfade leads, then metadata and buttons stagger
const contentStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.45,
      ease: EASE,
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const contentRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// touch only: the spotlight answers a horizontal swipe, desktop keeps its dots
const TOUCH_QUERY = window.matchMedia("(hover: none) and (pointer: coarse)");

function subscribeTouch(onChange: () => void) {
  TOUCH_QUERY.addEventListener("change", onChange);
  return () => TOUCH_QUERY.removeEventListener("change", onChange);
}

function useTouchPointer(): boolean {
  return useSyncExternalStore(
    subscribeTouch,
    () => TOUCH_QUERY.matches,
  );
}

function useTitleDetails(item: MediaItem) {
  return useQuery({
    queryKey: ["details", item.mediaType, item.id],
    queryFn: () => fetchMediaDetails(item.mediaType, item.id),
    ...standardQueryOptions,
  });
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function CTag({ item }: { item: MediaItem }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/85">
      <span className="font-display font-bold text-white">C</span>
      {item.mediaType === "movie" ? "Film" : "Series"}
    </span>
  );
}

function SpotlightContent({ item }: { item: MediaItem }) {
  const navigate = useNavigate();
  const openDetail = useUIStore((state) => state.openDetail);
  const details: MediaDetails | undefined = useTitleDetails(item).data;
  const logo = details?.titleLogos[0];

  const lengthPart =
    item.mediaType === "movie"
      ? details && details.runtime !== null
        ? formatRuntime(details.runtime)
        : null
      : details && details.numberOfSeasons > 0
        ? `${details.numberOfSeasons} Season${details.numberOfSeasons === 1 ? "" : "s"}`
        : null;
  const metaParts = [
    item.releaseYear !== null ? String(item.releaseYear) : null,
    lengthPart,
    details
      ? details.genres.slice(0, 2).map((genre) => genre.name).join(" · ")
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col justify-end"
      variants={contentStagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.25, ease: EASE } }}
    >
      <div className="max-w-2xl p-6 pb-7">
        <motion.div variants={contentRise}>
          <CTag item={item} />
        </motion.div>
        <motion.div
          variants={contentRise}
          className="mt-4 flex min-h-[68px] items-end overflow-hidden"
        >
          {logo ? (
            <motion.img
              src={tmdbImageUrl(logo.filePath, "w500")}
              alt={item.title}
              onError={retryImageElement}
              initial={{ clipPath: "inset(0 100% 0 0)", filter: "blur(8px)" }}
              animate={{
                clipPath: "inset(0 0% 0 0)",
                filter: "blur(0px)",
                transition: { duration: 0.7, ease: EASE },
              }}
              className="max-h-[68px] w-auto max-w-[420px] object-contain drop-shadow-[0_4px_24px_rgba(7,8,10,0.7)] max-lg:max-w-full"
            />
          ) : (
            <motion.h2
              initial={{ clipPath: "inset(0 100% 0 0)", filter: "blur(8px)" }}
              animate={{
                clipPath: "inset(0 0% 0 0)",
                filter: "blur(0px)",
                transition: { duration: 0.7, ease: EASE },
              }}
              className="font-display text-3xl font-extrabold leading-tight text-ink drop-shadow-[0_4px_24px_rgba(7,8,10,0.7)]"
            >
              {details ? details.title : item.title}
            </motion.h2>
          )}
        </motion.div>
        <motion.div
          variants={contentRise}
          className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-[15px]"
        >
          <span className="flex items-center gap-1 font-semibold text-emerald">
            <Star size={13} aria-hidden="true" />
            {item.voteAverage.toFixed(1)}
          </span>
          {metaParts.map((part) => (
            <span key={part} className="flex items-center gap-1">
              <span aria-hidden="true" className="text-white/40">
                ·
              </span>
              <span className="text-white/85">{part}</span>
            </span>
          ))}
        </motion.div>
        <motion.p
          variants={contentRise}
          className="mt-4 line-clamp-3 max-w-md text-sm leading-relaxed text-white/80"
        >
          {item.overview}
        </motion.p>
        <motion.div variants={contentRise} className="mt-6 flex items-center gap-3">
          {/* 1px hover lift: polish-pass exception to the static hover grammar */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() => navigate(buildWatchPath(item.mediaType, item.id))}
            aria-label={`Play ${item.title}`}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition duration-250 ease-in-out hover:-translate-y-px hover:bg-white/75 max-lg:min-h-11"
          >
            <Play size={16} aria-hidden="true" />
            Play
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() =>
              openDetail({ id: item.id, mediaType: item.mediaType })
            }
            aria-label={`More info about ${item.title}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/15 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors duration-250 ease-in-out hover:bg-white/25 max-lg:min-h-11"
          >
            <Info size={16} aria-hidden="true" />
            More Info
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SpotlightCard({
  spots,
  index,
  onSelect,
}: {
  spots: MediaItem[];
  index: number;
  onSelect: (index: number) => void;
}) {
  const active = spots[index];
  const itemKey = `${active.mediaType}-${active.id}`;
  const touchPointer = useTouchPointer();
  const rotate = (direction: 1 | -1) =>
    onSelect((index + direction + spots.length) % spots.length);

  return (
    <motion.div
      variants={rise}
      drag={touchPointer ? "x" : false}
      dragDirectionLock
      // rubber band both ways, the swipe only commits past a threshold
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (info.offset.x < -60) {
          rotate(1);
        } else if (info.offset.x > 60) {
          rotate(-1);
        }
      }}
      className={`material-card relative ${HERO_HEIGHT} overflow-hidden rounded-hero lg:col-span-7`}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={itemKey}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {active.backdropPath ? (
            <TmdbImage
              path={active.backdropPath}
              size="w1280"
              alt=""
              width={1280}
              height={720}
              fetchPriority="high"
              // backdrop art sits right so the gradient side stays readable
              className="kenburns absolute inset-y-0 right-0 h-full w-[78%] object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-surface-2" />
          )}
        </motion.div>
      </AnimatePresence>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,16,14,0.96)_0%,rgba(16,16,14,0.78)_28%,rgba(16,16,14,0.25)_55%,rgba(16,16,14,0)_75%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-canvas)_0%,rgba(18,19,18,0)_46%)]"
      />
      <AnimatePresence initial={false}>
        <SpotlightContent key={itemKey} item={active} />
      </AnimatePresence>
      {spots.length > 1 && (
        <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5">
          {spots.map((spot, i) => {
            const activeDot = i === index;
            return (
              <button
                key={`${spot.mediaType}-${spot.id}`}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Show ${spot.title}`}
                aria-current={activeDot}
                // 44px hit area, the visible dot inside stays a hairline marker
                className="grid h-11 w-11 place-items-center rounded-full"
              >
                <motion.span
                  layout
                  transition={{ duration: 0.25, ease: EASE }}
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full ${
                    activeDot
                      ? "w-3 bg-white"
                      : "w-1.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function HeroSideCard({ item }: { item: MediaItem }) {
  const openDetail = useUIStore((state) => state.openDetail);
  const details: MediaDetails | undefined = useTitleDetails(item).data;
  const logo = details?.titleLogos[0];
  const genreLine = details
    ? details.genres.slice(0, 2).map((genre) => genre.name).join(" · ")
    : null;

  return (
    <motion.button
      variants={rise}
      type="button"
      layoutId={`title-${item.mediaType}-${item.id}`}
      onClick={() => openDetail({ id: item.id, mediaType: item.mediaType })}
      aria-label={`Open details for ${item.title}`}
      whileHover={{ scale: 1.02, transition: { duration: 0.35, ease: EASE } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.25, ease: EASE } }}
      className={`material-card group relative ${HERO_HEIGHT} w-[72%] shrink-0 snap-start overflow-hidden rounded-hero text-left transition-colors duration-350 ease-in-out hover:border-white/20 sm:w-[46%] lg:w-auto`}
    >
      {item.posterPath ? (
        <TmdbImage
          path={item.posterPath}
          size="w500"
          alt=""
          width={500}
          height={750}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-2" />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,12,11,0.95)_10%,rgba(12,12,11,0)_65%)]"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        <CTag item={item} />
        <div className="mt-2 flex min-h-[36px] items-end overflow-hidden">
          {logo ? (
            <TmdbImage
              path={logo.filePath}
              size="w500"
              alt={item.title}
              className="max-h-9 w-auto max-w-[200px] object-contain drop-shadow-[0_2px_12px_rgba(7,8,10,0.6)]"
            />
          ) : (
            <span className="line-clamp-2 font-display text-lg font-bold leading-tight text-ink">
              {item.title}
            </span>
          )}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <span className="flex items-center gap-1 font-semibold text-emerald">
            <Star size={12} aria-hidden="true" />
            {item.voteAverage.toFixed(1)}
          </span>
          {genreLine && <span className="text-ink-dim">{genreLine}</span>}
        </p>
      </div>
    </motion.button>
  );
}

function BentoSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-12" aria-hidden="true">
      <div className={`shimmer ${HERO_HEIGHT} rounded-hero lg:col-span-7`} />
      <div className="grid grid-cols-2 gap-4 lg:col-span-5">
        <div className={`shimmer ${HERO_HEIGHT} rounded-hero`} />
        <div className={`shimmer ${HERO_HEIGHT} rounded-hero`} />
      </div>
    </div>
  );
}

interface BentoHeroProps {
  items: MediaItem[];
  loading: boolean;
  error: string | null;
}

export function BentoHero({ items, loading, error }: BentoHeroProps) {
  const [index, setIndex] = useState(0);
  const spots = items.slice(0, 3);
  const sides = items.slice(3, 5);
  const activeIndex = spots.length === 0 ? 0 : index % spots.length;
  // the spotlight artwork is the room's light source: its average color spills behind the bento
  const spillColor = useAverageColor(
    spots[activeIndex]?.backdropPath
      ? tmdbImageUrl(spots[activeIndex].backdropPath, "w500")
      : null,
  );

  useEffect(() => {
    if (spots.length < 2) return;
    // dep on activeIndex so a manual dot press resets the 9s window
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % spots.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [activeIndex, spots.length]);

  if (error) {
    return (
      <div
        className={`material-card grid ${HERO_HEIGHT} place-items-center rounded-hero px-6 text-center`}
      >
        <p className="max-w-md text-sm leading-relaxed text-ink-dim">
          Could not load the spotlight. {error} Check your connection and
          reload the page.
        </p>
      </div>
    );
  }

  if (loading) {
    return <BentoSkeleton />;
  }

  if (spots.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <AnimatePresence initial={false}>
        {spillColor && (
          <motion.div
            key={spillColor}
            aria-hidden="true"
            // blur is halved below lg like the materials, it is the top mobile GPU cost
            className="pointer-events-none absolute inset-x-[-6%] top-[-48px] h-[420px] blur-[110px] max-lg:blur-[72px]"
            style={{
              background: `radial-gradient(ellipse 50% 45% at 50% 40%, ${spillColor}, transparent)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE } }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        )}
      </AnimatePresence>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative grid gap-4 lg:grid-cols-12"
      >
      <SpotlightCard spots={spots} index={activeIndex} onSelect={setIndex} />
      {sides.length > 0 && (
        // below lg the two portrait cards swipe; at lg the original 2-up grid returns
        <div className="flex snap-x gap-4 overflow-x-auto overscroll-x-contain max-lg:overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:col-span-5 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
          {sides.map((item) => (
            <HeroSideCard key={`${item.mediaType}-${item.id}`} item={item} />
          ))}
        </div>
      )}
      </motion.div>
    </div>
  );
}

export default BentoHero;
