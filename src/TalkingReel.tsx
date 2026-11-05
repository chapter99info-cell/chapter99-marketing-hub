// Template 004 — TalkingReel
// Talking-head clip(s) with dead air cut out + big word-synced captions
// (current word highlighted in the brand accent). Data comes from
// public/edits/<clip>.json, produced by `npm run prep -- public/recordings/<clip>.mp4`.
import React, { useMemo } from "react";
import { z } from "zod";
import { Video } from "@remotion/media";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, fontsReady } from "./fonts";

// ---------- Schema ----------
const segmentSchema = z.object({ start: z.number(), end: z.number() }); // seconds in source
const captionSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
});
const editSchema = z.object({
  source: z.string(), // path inside /public, e.g. "recordings/my-clip.mp4"
  duration: z.number(),
  segments: z.array(segmentSchema),
  captions: z.array(captionSchema),
});
export type EditFile = z.infer<typeof editSchema>;

export const talkingReelSchema = z.object({
  brand: z.string(),
  accent: z.string(), // highlight colour for the spoken word
  captionTop: z.number(), // caption block position, % of height
  wordsPerPageMs: z.number(), // how long one caption "page" may span (lower = fewer words on screen)
  clips: z.array(z.object({ edit: z.string() })).min(1), // file names in public/edits
  // Filled in by calculateMetadata — do not write by hand.
  resolved: z.array(editSchema.nullable()).optional(),
});
export type TalkingReelProps = z.infer<typeof talkingReelSchema>;

const PLACEHOLDER_SECONDS = 3;

/** Frames each clip occupies after cutting (pure; exported for tests). */
export const clipFrames = (edit: EditFile | null, fps: number) =>
  edit
    ? edit.segments.reduce((s, k) => s + Math.max(1, Math.round((k.end - k.start) * fps)), 0)
    : PLACEHOLDER_SECONDS * fps;

// Loads every edit JSON once, before render, and sets total duration.
export const calculateTalkingMetadata: CalculateMetadataFunction<TalkingReelProps> = async ({
  props,
  abortSignal,
}) => {
  await fontsReady;
  const resolved = await Promise.all(
    props.clips.map(async (c) => {
      try {
        const res = await fetch(staticFile(`edits/${c.edit}`), { signal: abortSignal });
        if (!res.ok) return null;
        return editSchema.parse(await res.json());
      } catch {
        return null; // missing file → placeholder scene telling you to run prep
      }
    }),
  );
  const fps = 30;
  return {
    durationInFrames: resolved.reduce((s, e) => s + clipFrames(e, fps), 0),
    props: { ...props, resolved },
  };
};

// ---------- Captions for one kept segment ----------
const SegmentCaptions: React.FC<{
  captions: Caption[];
  segStartMs: number;
  accent: string;
  top: number;
  pageMs: number;
}> = ({ captions, segStartMs, accent, top, pageMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: pageMs }),
    [captions, pageMs],
  );
  // Map timeline frame → time in the ORIGINAL recording.
  const t = segStartMs + (frame / fps) * 1000;
  const page = pages.find((p) => t >= p.startMs && t < p.startMs + p.durationMs);
  if (!page) return null;

  // Pop-in when the page appears (or immediately if it started before this cut).
  const pageFrame = Math.max(0, frame - ((page.startMs - segStartMs) / 1000) * fps);
  const pop = spring({ frame: pageFrame, fps, config: { damping: 14, stiffness: 180 } });

  return (
    <div
      style={{
        position: "absolute",
        top: `${top}%`,
        left: "7%",
        width: "86%",
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 78,
        lineHeight: 1.25,
        color: "#fff",
        WebkitTextStroke: "10px rgba(0,0,0,0.85)",
        paintOrder: "stroke fill",
        textShadow: "0 8px 24px rgba(0,0,0,0.45)",
        scale: interpolate(pop, [0, 1], [0.82, 1]),
        opacity: interpolate(pop, [0, 1], [0, 1]),
        whiteSpace: "pre-wrap",
      }}
    >
      {page.tokens.map((tok, i) => {
        const active = t >= tok.fromMs && t < tok.toMs;
        return (
          <span key={i} style={{ color: active ? accent : "#fff" }}>
            {tok.text}
          </span>
        );
      })}
    </div>
  );
};

// ---------- Placeholder when the edit file is missing ----------
const Missing: React.FC<{ edit: string }> = ({ edit }) => (
  <AbsoluteFill
    style={{
      background: "#111",
      color: "#fff",
      fontFamily: FONT,
      fontSize: 44,
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: 80,
    }}
  >
    ยังไม่มี public/edits/{edit}
    <div style={{ fontSize: 32, opacity: 0.7, marginTop: 24 }}>
      รัน: npm run prep -- public/recordings/&lt;คลิป&gt;.mp4
    </div>
  </AbsoluteFill>
);

// ---------- Composition ----------
export const TalkingReel: React.FC<TalkingReelProps> = (p) => {
  const { fps } = useVideoConfig();
  let cursor = 0;
  const pieces: React.ReactNode[] = [];

  p.clips.forEach((clip, ci) => {
    const edit = p.resolved?.[ci] ?? null;
    if (!edit) {
      pieces.push(
        <Sequence key={`m${ci}`} from={cursor} durationInFrames={PLACEHOLDER_SECONDS * fps}>
          <Missing edit={clip.edit} />
        </Sequence>,
      );
      cursor += PLACEHOLDER_SECONDS * fps;
      return;
    }
    edit.segments.forEach((seg, si) => {
      const len = Math.max(1, Math.round((seg.end - seg.start) * fps));
      pieces.push(
        <Sequence key={`${ci}-${si}`} name={`Clip ${ci + 1} · cut ${si + 1}`} from={cursor} durationInFrames={len}>
          <Video
            src={staticFile(edit.source)}
            trimBefore={Math.round(seg.start * fps)}
            objectFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
          <SegmentCaptions
            captions={edit.captions}
            segStartMs={seg.start * 1000}
            accent={p.accent}
            top={p.captionTop}
            pageMs={p.wordsPerPageMs}
          />
        </Sequence>,
      );
      cursor += len;
    });
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {pieces}
      <div
        style={{
          position: "absolute",
          top: 70,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 30,
          letterSpacing: 6,
          color: "rgba(255,255,255,0.85)",
          textShadow: "0 2px 10px rgba(0,0,0,0.35)",
        }}
      >
        {p.brand}
      </div>
    </AbsoluteFill>
  );
};
