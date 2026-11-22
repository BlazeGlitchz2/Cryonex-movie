import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaItem } from "../../types/media";
import { MediaCard } from "../shared/MediaCard";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// w-40 poster plus the Netflix numeral overhang on its left edge
const CARD_WIDTH = 160;
const NUMERAL_HANG = 64;
const TILE_WIDTH = CARD_WIDTH + NUMERAL_HANG;

interface Top10RowProps {
  title: string;
  items: MediaItem[];
  loading?: boolean;
  error?: string | null;
}

function RowHeader({ title }: { title: string }) {
  return (
    <h2 className="flex items-center gap-1 font-display text-lg font-semibold text-ink">
      {title}
      <ChevronRight size={16} aria-hidden="true" className="text-ink-dim" />
    </h2>
  );
}

// numeral sits behind the poster, its right half covered by the poster edge
function Top10Tile({ item, rank }: { item: MediaItem; rank: number }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.55, ease: EASE },
        },
      }}
      className="relative shrink-0 snap-start"
      style={{ width: TILE_WIDTH }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-26px] left-0 select-none font-display text-[150px] font-extrabold leading-none"
        style={{
          WebkitTextStroke: "3px rgba(245,245,247,0.55)",
          color: "transparent",
        }}
      >
        {rank}
      </span>
      <div className="relative z-10 ml-16">
        <MediaCard item={item} />
      </div>
    </motion.div>
  );
}

export function Top10Row({
  title,
  items,
  loading = false,
  error = null,
}: Top10RowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    // one state pass per frame at most, however fast the scroll fires
    const scheduleUpdate = () => {
      if (raf === 0) {
        raf = requestAnimationFrame(update);
      }
    };
    update();
    el.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      el.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [items]);

  const scrollToCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // land on an exact card edge so snap never yanks the viewport back
    const cards = Array.from(el.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const target =
      direction === 1
        ? cards.find(
            (card) => card.offsetLeft > el.scrollLeft + el.clientWidth * 0.5,
          )
        : cards
            .filter(
              (card) => card.offsetLeft < el.scrollLeft - el.clientWidth * 0.5,
            )
            .pop();
    target?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  };

  if (error) {
    return (
      <section>
        <RowHeader title={title} />
        <p className="mt-3 text-sm text-ink-dim">
          Could not load {title.toLowerCase()}. {error} Check your connection
          and reload the page.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section>
        <RowHeader title={title} />
        <div className="mt-4 flex gap-4" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="shimmer h-60 shrink-0 rounded-card border border-hairline"
              style={{ width: TILE_WIDTH }}
            />
          ))}
        </div>
      </section>
    );
  }

  // ranks come from trending order; fewer than 10 results render fewer tiles
  if (items.length === 0) return null;

  return (
    <section>
      <RowHeader title={title} />
      <div className="relative mt-4">
        <motion.div
          ref={scrollerRef}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          // py-6 -my-6: lift room inside the scroll box, outer rhythm kept
          className="flex snap-x gap-4 overflow-x-auto overscroll-x-contain overscroll-y-auto py-6 -my-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <Top10Tile key={`${item.mediaType}-${item.id}`} item={item} rank={index + 1} />
          ))}
        </motion.div>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-canvas to-transparent transition-opacity duration-250 ease-in-out ${
            canLeft ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-canvas to-transparent transition-opacity duration-250 ease-in-out ${
            canRight ? "opacity-100" : "opacity-0"
          }`}
        />
        <AnimatePresence>
          {canLeft && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -4, y: "-50%" }}
              animate={{ opacity: 1, x: 0, y: "-50%" }}
              exit={{ opacity: 0, x: -4, y: "-50%" }}
              transition={{ duration: 0.25, ease: EASE }}
              whileHover={{
                scale: 1.08,
                transition: { type: "spring", stiffness: 260, damping: 26 },
              }}
              whileTap={{
                scale: 0.92,
                transition: { duration: 0.25, ease: EASE },
              }}
              onClick={() => scrollToCard(-1)}
              className="absolute -left-3 top-1/2 z-10 grid h-10 w-10 place-items-center rounded-full border border-hairline bg-surface text-ink transition-colors duration-250 ease-in-out hover:bg-surface-2"
              aria-label={`Scroll ${title} backward`}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {canRight && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 4, y: "-50%" }}
              animate={{ opacity: 1, x: 0, y: "-50%" }}
              exit={{ opacity: 0, x: 4, y: "-50%" }}
              transition={{ duration: 0.25, ease: EASE }}
              whileHover={{
                scale: 1.08,
                transition: { type: "spring", stiffness: 260, damping: 26 },
              }}
              whileTap={{
                scale: 0.92,
                transition: { duration: 0.25, ease: EASE },
              }}
              onClick={() => scrollToCard(1)}
              className="absolute -right-3 top-1/2 z-10 grid h-10 w-10 place-items-center rounded-full border border-hairline bg-surface text-ink transition-colors duration-250 ease-in-out hover:bg-surface-2"
              aria-label={`Scroll ${title} forward`}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default Top10Row;
