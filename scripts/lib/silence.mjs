// Pure helpers for dead-air cutting. No I/O here, so they are easy to unit-test.
// Used by scripts/prep.mjs (which runs ffmpeg and passes its text output in).

/** Read the "Duration: HH:MM:SS.xx" line from ffmpeg stderr → seconds (or null). */
export const parseDuration = (stderr) => {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

/** Read loudnorm's JSON block → gating threshold in dB (used as adaptive silence level). */
export const parseLoudnormThreshold = (stderr) => {
  const m = stderr.match(/\{[^{}]*"input_thresh"[^{}]*\}/);
  if (!m) return null;
  const v = Number(JSON.parse(m[0]).input_thresh);
  return Number.isFinite(v) ? v : null;
};

/** Parse silencedetect output → [{start, end}] in seconds. An unclosed silence runs to `duration`. */
export const parseSilences = (stderr, duration) => {
  const out = [];
  let open = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) open = Math.max(0, Number(s[1]));
    if (e && open !== null) {
      out.push({ start: open, end: Number(e[1]) });
      open = null;
    }
  }
  if (open !== null && duration != null) out.push({ start: open, end: duration });
  return out;
};

/**
 * Turn silences into the parts we KEEP (the talking).
 * pad     – seconds of breathing room left around speech so cuts don't clip words
 * minKeep – drop kept pieces shorter than this (clicks, coughs)
 */
export const keepSegments = (silences, duration, { pad = 0.12, minKeep = 0.3 } = {}) => {
  const sorted = [...silences].sort((a, b) => a.start - b.start);
  const keep = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start > cursor) keep.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < duration) keep.push({ start: cursor, end: duration });

  // Drop blips by their real length first, then widen by `pad`, clamp, merge overlaps.
  const padded = keep
    .filter((k) => k.end - k.start >= minKeep)
    .map((k) => ({ start: Math.max(0, k.start - pad), end: Math.min(duration, k.end + pad) }));
  const merged = [];
  for (const k of padded) {
    const last = merged[merged.length - 1];
    if (last && k.start <= last.end) last.end = Math.max(last.end, k.end);
    else merged.push({ ...k });
  }
  return merged.map((k) => ({ start: round3(k.start), end: round3(k.end) }));
};

const round3 = (n) => Math.round(n * 1000) / 1000;
