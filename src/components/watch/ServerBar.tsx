import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import type { StreamProvider } from "../../types/media";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

interface ServerBarProps {
  title: string | null;
  episodeLabel: string | null;
  providers: StreamProvider[];
  activeId: string;
  onSelect: (id: string) => void;
  cinemaDim: boolean;
  onToggleCinemaDim: () => void;
  extra?: ReactNode;
}

export default function ServerBar({
  title,
  episodeLabel,
  providers,
  activeId,
  onSelect,
  cinemaDim,
  onToggleCinemaDim,
  extra,
}: ServerBarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const update = () => {
      setEdges({
        left: scroller.scrollLeft > 1,
        right:
          scroller.scrollLeft + scroller.clientWidth <
          scroller.scrollWidth - 1,
      });
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [providers.length]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const pill = scroller?.querySelector<HTMLElement>(
      `[data-server-id="${CSS.escape(activeId)}"]`,
    );
    if (!scroller || !pill) {
      return;
    }
    const target =
      pill.offsetLeft - (scroller.clientWidth - pill.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeId, providers.length]);

  return (
    <div className="material-dock flex min-w-0 items-center gap-3 rounded-hero px-3 py-2">
      <Link
        to="/"
        aria-label="Back to browse"
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white/50 bg-white/5 text-ink transition-colors duration-[250ms] ease-in-out hover:border-white"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>

      {(title !== null || episodeLabel !== null) && (
        <div className="flex min-w-0 items-center gap-2.5">
          {title !== null && (
            <p className="min-w-0 truncate font-display text-sm font-semibold text-ink">
              {title}
            </p>
          )}
          {episodeLabel !== null && (
            <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 font-display text-[11px] font-semibold text-ink-dim">
              {episodeLabel}
            </span>
          )}
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollerRef}
          role="group"
          aria-label="Streaming sources"
          className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {providers.map((provider) => {
              const active = provider.id === activeId;
              return (
                <motion.button
                  key={provider.id}
                  layout
                  type="button"
                  data-server-id={provider.id}
                  aria-pressed={active}
                  onClick={() => onSelect(provider.id)}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={`relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-sm transition-colors duration-[250ms] ease-in-out ${
                    active ? "text-ink" : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="server-active"
                      aria-hidden="true"
                      transition={{ duration: 0.4, ease: EASE }}
                      className="absolute inset-0 rounded-full bg-white/[0.11]"
                    />
                  )}
                  {active && (
                    // emerald marks the real active server, never decoration
                    <span
                      aria-hidden="true"
                      className="relative z-10 size-1.5 shrink-0 rounded-full bg-emerald"
                    />
                  )}
                  <span className="relative z-10">
                    {provider.name}
                    {provider.badge && (
                      <span className="ml-2 text-[11px] font-normal text-ink-dim">
                        {provider.badge}
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        {/* edge fades carry the dock fill so pills sink into the strip */}
        <motion.div
          aria-hidden="true"
          animate={{ opacity: edges.left ? 1 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#191917d9] to-transparent"
        />
        <motion.div
          aria-hidden="true"
          animate={{ opacity: edges.right ? 1 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#191917d9] to-transparent"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <motion.button
          type="button"
          onClick={onToggleCinemaDim}
          aria-pressed={cinemaDim}
          aria-label="Cinema dim"
          title={cinemaDim ? "Turn cinema dim off" : "Turn cinema dim on"}
          whileTap={{ scale: 0.94, transition: { duration: 0.25, ease: EASE } }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white/50 bg-white/5 text-ink transition-colors duration-[250ms] ease-in-out hover:border-white"
        >
          {cinemaDim ? (
            <Sun size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
