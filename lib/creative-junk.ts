/** Scraped fonts, 1px trackers, formula/math posters, blue geometric decorations. */
export const JUNK_CREATIVE_SRC =
  /\.woff2?(?:\?|$)|\.ttf(?:\?|$)|\.eot(?:\?|$)|\.otf(?:\?|$)|fonts?\/|pixel|1x1|spacer|blank\.gif|formula|equation|math[-_ ]?(poster|board)?|geometric|abstract[-_ ]?(shape|blue)|elementor|placeholder|sprite|upscalemedia|group-\d+\.png/i;

export function isJunkCreativeSrc(src: string): boolean {
  return JUNK_CREATIVE_SRC.test(String(src || ""));
}
