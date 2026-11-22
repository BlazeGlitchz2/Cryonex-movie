import type { SyntheticEvent } from "react";

export const IMAGE_RETRY_DELAYS = [450, 1400];

// retry ladder for animated <motion.img> logo art that cannot use TmdbImage
export function retryImageElement(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  const image = event.currentTarget;
  const attempt = Number(image.dataset.retry ?? "0");
  if (attempt >= IMAGE_RETRY_DELAYS.length) {
    image.style.visibility = "hidden";
    return;
  }
  image.dataset.retry = String(attempt + 1);
  const base = image.src.split("?")[0];
  window.setTimeout(() => {
    image.src = `${base}?retry=${attempt + 1}`;
  }, IMAGE_RETRY_DELAYS[attempt]);
}
