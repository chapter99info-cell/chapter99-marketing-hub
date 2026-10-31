// Loads Kanit (Thai + Latin) from /public/fonts so Thai text renders offline.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT = "Kanit";

const weights = ["400", "700", "800"] as const;
const subsets = [
  { name: "thai", range: "U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC" },
  { name: "latin", range: "U+0000-00FF, U+2000-206F, U+20AC, U+2122, U+2190-2199" },
] as const;

export const fontsReady = Promise.all(
  weights.flatMap((weight) =>
    subsets.map((s) =>
      loadFont({
        family: FONT,
        url: staticFile(`fonts/kanit-${s.name}-${weight}-normal.woff2`),
        weight,
        unicodeRange: s.range,
      }),
    ),
  ),
);
