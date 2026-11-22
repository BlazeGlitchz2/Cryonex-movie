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
  const base = src ?? (path ? tmdbImageUrl(path, size) : null);
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
    return () => observer.disconnect();
  }, [visible, base]);

  useEffect(
    () => () => {
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current);
      }
    },
    [],
  );

  if (!base) {
    return null;
  }

  const resolved =
    attempt === 0
      ? base
      : `${base}${base.includes("?") ? "&" : "?"}retry=${attempt}`;

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
        setFailed(true);
      }}
      className={`${className ?? ""}${failed ? " opacity-0" : ""}`}
    />
  );
}

export default TmdbImage;
