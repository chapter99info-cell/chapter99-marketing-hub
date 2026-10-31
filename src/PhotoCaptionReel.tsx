// Template 003 — PhotoCaptionReel
// Full-screen photo/video with small white "note" captions that type in one
// after another (soft, aesthetic diary style). Each scene = one photo or clip.
import React from "react";
import { z } from "zod";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT } from "./fonts";

// ---------- Schema ----------
export const captionSchema = z.object({
  text: z.string(),
  at: z.number(), // seconds after the scene starts
  x: z.number(), // left position, % of width
  y: z.number(), // top position, % of height
  size: z.number().optional(), // font size px (default 38)
});

export const sceneSchema = z.object({
  photo: z.string().optional(), // file in public/photos
  video: z.string().optional(), // file in public/videos
  start: z.number().optional(), // seconds into the video to start from
  seconds: z.number(),
  captions: z.array(captionSchema),
});

export const photoCaptionSchema = z.object({
  brand: z.string(),
  scenes: z.array(sceneSchema).min(1),
});

export type PhotoCaptionProps = z.infer<typeof photoCaptionSchema>;

export const photoCaptionDuration = (p: PhotoCaptionProps, fps: number) =>
  p.scenes.reduce((sum, s) => sum + Math.round(s.seconds * fps), 0);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const graphemes = (t: string) =>
  Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(t), (g) => g.segment);

// ---------- Background: photo with slow zoom, or video, or soft sky fallback ----------
const Background: React.FC<{ photo?: string; video?: string; start?: number }> = ({
  photo,
  video,
  start,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  if (video) {
    return (
      <Video
        src={staticFile(`videos/${video}`)}
        trimBefore={Math.round((start ?? 0) * fps)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  if (photo) {
    return (
      <Img
        src={staticFile(`photos/${photo}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: interpolate(frame, [0, durationInFrames], [1.0, 1.12]),
        }}
      />
    );
  }
  // Placeholder until real photos are added
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #7FB6DE 0%, #A9D0EA 45%, #E7C9D8 100%)",
      }}
    />
  );
};

// ---------- One white note caption ----------
const Note: React.FC<{ c: z.infer<typeof captionSchema> }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const chars = graphemes(c.text);
  const shown = Math.floor(interpolate(frame, [0, 1.2 * fps], [0, chars.length], clamp));
  return (
    <div
      style={{
        position: "absolute",
        left: `${c.x}%`,
        top: `${c.y}%`,
        maxWidth: "62%",
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 10,
        padding: "16px 26px",
        fontFamily: FONT,
        fontWeight: 400,
        fontSize: c.size ?? 38,
        lineHeight: 1.35,
        color: "#2a2a2a",
        boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
        opacity: interpolate(
          frame,
          [0, 0.3 * fps, durationInFrames - 0.4 * fps, durationInFrames],
          [0, 1, 1, 0],
          clamp,
        ),
        translate: interpolate(frame, [0, 0.5 * fps], ["0px 18px", "0px 0px"], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {chars.slice(0, shown).join("")}
      {/* invisible full text keeps the box size stable while typing */}
      <span style={{ visibility: "hidden" }}>{chars.slice(shown).join("")}</span>
    </div>
  );
};

// ---------- Scene ----------
const Scene: React.FC<{ scene: z.infer<typeof sceneSchema> }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const len = Math.round(scene.seconds * fps);
  return (
    <AbsoluteFill>
      <Background photo={scene.photo} video={scene.video} start={scene.start} />
      {scene.captions.map((c, i) => {
        const from = Math.round(c.at * fps);
        return (
          <Sequence key={i} name={`Caption ${i + 1}`} from={from} durationInFrames={len - from}>
            <Note c={c} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Composition ----------
export const PhotoCaptionReel: React.FC<PhotoCaptionProps> = (p) => {
  const { fps } = useVideoConfig();
  let start = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {p.scenes.map((s, i) => {
        const len = Math.round(s.seconds * fps);
        const from = start;
        start += len;
        return (
          <Sequence key={i} name={`Scene ${i + 1}`} from={from} durationInFrames={len}>
            <Scene scene={s} />
          </Sequence>
        );
      })}
      {/* small brand mark bottom-centre */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
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
