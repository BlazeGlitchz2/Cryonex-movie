import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { MediaCard } from "../components/shared/MediaCard";
import {
  queryErrorMessage,
  standardQueryOptions,
} from "../components/shared/MediaRow";
import { fetchTrendingAll, fetchUpcomingMovies } from "../services/tmdb";
import type { MediaItem } from "../types/media";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="flex items-center gap-1 font-display text-lg font-semibold text-ink">
      {title}
      <ChevronRight size={16} aria-hidden="true" className="text-ink-dim" />
    </h2>
  );
}

function PosterGrid({
  items,
  pending,
  error,
  emptyText,
  onRetry,
}: {
  items: MediaItem[];
  pending: boolean;
  error: string | null;
  emptyText: string;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <p className="mt-3 text-sm text-ink-dim">
        Could not load this section. {error}{" "}
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-ink underline underline-offset-2 transition-colors duration-250 ease-in-out hover:text-white"
        >
          Try again
        </button>
      </p>
    );
  }

  if (pending) {
    return (
      <div className="mt-4 grid grid-cols-6 gap-4" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="shimmer aspect-[2/3] rounded-card" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="mt-3 text-sm text-ink-dim">{emptyText}</p>;
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      className="mt-4 grid grid-cols-6 gap-4"
    >
      {items.map((item) => (
        <motion.div key={`${item.mediaType}-${item.id}`} variants={rise}>
          <MediaCard item={item} className="w-full" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function NewAndPopularPage() {
  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrendingAll,
    ...standardQueryOptions,
  });
  const upcoming = useQuery({
    queryKey: ["upcoming-movies"],
    queryFn: fetchUpcomingMovies,
    ...standardQueryOptions,
  });

  return (
    <div className="space-y-8 px-8 pb-10 pt-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">
        New & Popular
      </h1>
      <section>
        <SectionHeader title="Trending Now" />
        <PosterGrid
          items={trending.data ?? []}
          pending={trending.isPending}
          error={queryErrorMessage(trending.error)}
          emptyText="TMDB has no trending titles right now. Check back later."
          onRetry={() => trending.refetch()}
        />
      </section>
      <section>
        <SectionHeader title="Coming Soon" />
        <PosterGrid
          items={upcoming.data ?? []}
          pending={upcoming.isPending}
          error={queryErrorMessage(upcoming.error)}
          emptyText="TMDB lists no upcoming movies right now. Check back later."
          onRetry={() => upcoming.refetch()}
        />
      </section>
    </div>
  );
}

export default NewAndPopularPage;
