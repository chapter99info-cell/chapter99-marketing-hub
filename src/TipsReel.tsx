// TipsReel — reusable 9:16 reel: Hook → numbered tip cards → CTA outro.
// Everything (text, photos, colours, timing) comes from props, so a new reel
// = a new JSON file in /reels. Animations use useCurrentFrame + interpolate only.
import React from "react";
import { z } from "zod";
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

// ---------- Schema (editable in Remotion Studio sidebar) ----------
export const tipSchema = z.object({
  label: z.string(), // e.g. "FIRST" / "ข้อแรก"
  kicker: z.string(), // small mono line above title
  title: z.string(),
  body: z.string().optional(),
  photo: z.string().optional(), // file name inside public/photos
});

export const tipsReelSchema = z.object({
  brand: z.string(),
  accent: z.string(), // hex colour for highlights
  hook: z.object({ pre: z.string(), accent: z.string(), post: z.string() }),
  tips: z.array(tipSchema).min(1).max(6),
  cta: z.object({ title: z.string(), sub: z.string() }),
  hookSeconds: z.number(),
  tipSeconds: z.number(),
  ctaSeconds: z.number(),
});

export type TipsReelProps = z.infer<typeof tipsReelSchema>;

// Total duration helper (used by calculateMetadata in Root.tsx)
export const reelDurationInFrames = (p: TipsReelProps, fps: number) =>
  Math.round((p.hookSeconds + p.tips.length * p.tipSeconds + p.ctaSeconds) * fps);

const INK = "#141414";
const PAPER = "#EFEDE8";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const outExpo = Easing.bezier(0.16, 1, 0.3, 1);

// ---------- Background: halftone dots that slowly breathe ----------
const Halftone: React.FC<{ strength: number }> = ({ strength }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${INK} 32%, transparent 34%)`,
          backgroundSize: "44px 44px",
          backgroundPosition: `${frame * 0.4}px ${frame * 0.4}px`,
          opacity: strength,
          // fade dots toward the centre so text stays readable
          maskImage: "radial-gradient(ellipse 55% 45% at 50% 50%, transparent 30%, black 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 55% 45% at 50% 50%, transparent 30%, black 85%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Brand tag (top-left, all scenes) ----------
const BrandTag: React.FC<{ brand: string; accent: string }> = ({ brand, accent }) => (
  <div
    style={{
      position: "absolute",
      top: 90,
      left: 70,
      display: "flex",
      alignItems: "center",
      gap: 14,
      backgroundColor: "#fff",
      border: `4px solid ${INK}`,
      borderRadius: 40,
      padding: "10px 28px",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 34,
      color: INK,
      letterSpacing: 1,
    }}
  >
    <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: accent }} />
    {brand}
  </div>
);

// ---------- Scene 1: Hook ----------
const Hook: React.FC<{ hook: TipsReelProps["hook"]; accent: string }> = ({ hook, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = (delay: number) => ({
    opacity: interpolate(frame, [delay, delay + 0.4 * fps], [0, 1], clamp),
    translate: interpolate(frame, [delay, delay + 0.6 * fps], ["0px 60px", "0px 0px"], {
      ...clamp,
      easing: outExpo,
    }),
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px" }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 112, lineHeight: 1.12, color: INK }}>
        <div style={line(0)}>{hook.pre}</div>
        <div style={{ ...line(0.25 * fps), color: accent, fontStyle: "italic" }}>
          {hook.accent}
          {/* underline swipe */}
          <div
            style={{
              height: 12,
              marginTop: 22,
              backgroundColor: accent,
              width: interpolate(frame, [0.6 * fps, 1.1 * fps], ["0%", "70%"], {
                ...clamp,
                easing: outExpo,
              }),
            }}
          />
        </div>
        <div style={line(0.5 * fps)}>{hook.post}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 2..n: Tip card (speech bubble with number tab) ----------
const TipCard: React.FC<{ tip: TipsReelProps["tips"][number]; index: number; accent: string }> = ({
  tip,
  index,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = interpolate(frame, [0, 0.5 * fps], [0, 1], { ...clamp, easing: outExpo });
  const exit = interpolate(frame, [durationInFrames - 0.3 * fps, durationInFrames], [1, 0], clamp);
  // Split by grapheme so Thai vowels/tone marks never get cut mid-letter
  const chars = Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(tip.title), (g) => g.segment);
  const typed = Math.floor(interpolate(frame, [0.4 * fps, 1.4 * fps], [0, chars.length], clamp));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit }}>
      {tip.photo ? (
        <div
          style={{
            position: "absolute",
            top: 260,
            width: 920,
            height: 620,
            borderRadius: 28,
            overflow: "hidden",
            border: `6px solid ${INK}`,
            opacity: enter,
          }}
        >
          <Img
            src={staticFile(`photos/${tip.photo}`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              // slow Ken Burns zoom
              scale: interpolate(frame, [0, durationInFrames], [1.05, 1.18]),
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: tip.photo ? 960 : 760,
          width: 920,
          scale: interpolate(enter, [0, 1], [0.85, 1]),
          opacity: enter,
          rotate: `${index % 2 === 0 ? -1.5 : 1.5}deg`,
        }}
      >
        {/* number tab */}
        <div
          style={{
            position: "absolute",
            top: -46,
            left: 40,
            backgroundColor: INK,
            color: "#fff",
            borderRadius: 18,
            padding: "10px 30px",
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 44,
            display: "flex",
            gap: 18,
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 60 }}>{index + 1}</span>
          <span style={{ letterSpacing: 4 }}>{tip.label}</span>
        </div>

        {/* bubble */}
        <div
          style={{
            backgroundColor: "#fff",
            border: `6px solid ${INK}`,
            borderRadius: 40,
            padding: "70px 56px 56px",
            boxShadow: `14px 14px 0 ${INK}`,
            fontFamily: FONT,
            color: INK,
            position: "relative",
          }}
        >
          <div style={{ fontSize: 34, color: "#777", fontFamily: "monospace", marginBottom: 14 }}>
            {tip.kicker}
          </div>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.2, minHeight: 80 }}>
            {chars.slice(0, typed).join("")}
          </div>
          {tip.body ? (
            <div
              style={{
                fontSize: 38,
                fontWeight: 400,
                lineHeight: 1.45,
                marginTop: 20,
                opacity: interpolate(frame, [1.4 * fps, 1.9 * fps], [0, 1], clamp),
              }}
            >
              {tip.body}
            </div>
          ) : null}
          <div
            style={{
              position: "absolute",
              right: 46,
              top: 40,
              fontSize: 120,
              fontWeight: 800,
              color: accent,
              opacity: 0.85,
            }}
          >
            ?
          </div>
          {/* bubble tail */}
          <div
            style={{
              position: "absolute",
              bottom: -46,
              right: 150,
              width: 0,
              height: 0,
              borderLeft: "30px solid transparent",
              borderRight: "30px solid transparent",
              borderTop: `46px solid ${INK}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Final scene: CTA ----------
const Cta: React.FC<{ cta: TipsReelProps["cta"]; accent: string }> = ({ cta, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div
        style={{
          backgroundColor: accent,
          color: "#fff",
          borderRadius: 40,
          border: `6px solid ${INK}`,
          boxShadow: `14px 14px 0 ${INK}`,
          padding: "70px 60px",
          textAlign: "center",
          fontFamily: FONT,
          scale: interpolate(frame, [0, 0.5 * fps], [0.6, 1], {
            ...clamp,
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.15 }}>{cta.title}</div>
        <div style={{ fontSize: 42, marginTop: 24 }}>{cta.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Composition ----------
export const TipsReel: React.FC<TipsReelProps> = (p) => {
  const { fps } = useVideoConfig();
  const hook = Math.round(p.hookSeconds * fps);
  const tip = Math.round(p.tipSeconds * fps);
  const cta = Math.round(p.ctaSeconds * fps);
  return (
    <AbsoluteFill>
      <Halftone strength={0.9} />
      <Sequence name="Hook" durationInFrames={hook}>
        <Hook hook={p.hook} accent={p.accent} />
      </Sequence>
      {p.tips.map((t, i) => (
        <Sequence key={i} name={`Tip ${i + 1}`} from={hook + i * tip} durationInFrames={tip}>
          <TipCard tip={t} index={i} accent={p.accent} />
        </Sequence>
      ))}
      <Sequence name="CTA" from={hook + p.tips.length * tip} durationInFrames={cta}>
        <Cta cta={p.cta} accent={p.accent} />
      </Sequence>
      <BrandTag brand={p.brand} accent={p.accent} />
    </AbsoluteFill>
  );
};
