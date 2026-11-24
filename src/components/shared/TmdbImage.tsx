import { Film } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IMAGE_RETRY_DELAYS } from "../../services/imageRetry";
import { tmdbImageUrl } from "../../services/tmdb";

type TmdbSize = "w500" | "w780" | "w1280" | "original";

interface TmdbImageProps {
  path?: string | null;
  src?: string | null;
  size?: TmdbSize;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}

export function TmdbImage({
  path,
  src,
  size = "w500",
  alt = "",
  className,
  width,
  height,
  eager = false,
  fetchPriority,
}: TmdbImageProps) {
  // a poster that fails at a large size gets one more chance at w500:
  // the smallest file is the most likely to arrive on a weak network
  const [downgraded, setDowngraded] = useState(false);
  const base =
    src ?? (path ? tmdbImageUrl(path, downgraded ? "w500" : size) : null);
  // logos have no intrinsic size, so a zero-area box would never intersect
  const eagerLoad = eager || width === undefined || height === undefined;
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimer = useRef<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(eagerLoad);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible || !base) {
      return;
    }
    const node = imgRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    // native lazy loading leaves images inside nested scrollers blank in
    // WebKit, so the viewport observer decides instead
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 400px" },
    );
    observer.observe(node);
    // safety net: if the observer never fires (edge cases inside nested
    // scrollers), show the image anyway rather than leave a blank frame
    const failsafe = window.setTimeout(() => setVisible(true), 4000);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [visible, base]);

  useEffect(() => {
    if (downgraded) {
      return;
    }
    return () => {
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current);
      }
    };
  }, [downgraded]);

  // a failed poster gets another chance when the network or the tab returns
  useEffect(() => {
    if (!failed) {
      return;
    }
    const revive = () => {
      setFailed(false);
      setAttempt(0);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        revive();
      }
    };
    window.addEventListener("online", revive);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", revive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [failed]);

  if (!base) {
    return null;
  }

  const resolved =
    attempt === 0
      ? base
      : `${base}${base.includes("?") ? "&" : "?"}retry=${attempt}`;

  if (failed) {
    // honest placeholder instead of an invisible frame: art failed, layout holds
    return (
      <div
        role="img"
        aria-label={alt}
        className={`grid place-items-center bg-surface-2 text-ink-dim ${className ?? ""}`}
        style={{
          aspectRatio:
            width !== undefined && height !== undefined
              ? `${width} / ${height}`
              : undefined,
        }}
      >
        <Film size={20} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={visible ? resolved : undefined}
      alt={alt}
      width={width}
      height={height}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={() => {
        if (attempt < IMAGE_RETRY_DELAYS.length && retryTimer.current === null) {
          retryTimer.current = window.setTimeout(() => {
            retryTimer.current = null;
            setAttempt((value) => value + 1);
          }, IMAGE_RETRY_DELAYS[attempt]);
          return;
        }
        // large sizes get one final chance at w500 before giving up
        if (
          !downgraded &&
          !src &&
          path &&
          size !== "w500" &&
          size !== "original"
        ) {
          setDowngraded(true);
          setAttempt(0);
          return;
        }
        setFailed(true);
      }}
      className={className}
    />
  );
}

export default TmdbImage;
