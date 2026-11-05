// Registers one composition per JSON file in /reels.
// Add a new reel = drop a new JSON in /reels, then add it to the list below.
import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { TipsReel, TipsReelProps, reelDurationInFrames, tipsReelSchema } from "./TipsReel";
import { fontsReady } from "./fonts";
import tasmania from "../reels/trip2talk-tasmania.json";
import massage from "../reels/chapter99-massage.json";
import t003spring from "../reels/003-trip2talk-spring.json";
import t003uluru from "../reels/003-trip2talk-uluru.json";
import {
  PhotoCaptionProps,
  PhotoCaptionReel,
  photoCaptionDuration,
  photoCaptionSchema,
} from "./PhotoCaptionReel";
import {
  TalkingReel,
  TalkingReelProps,
  calculateTalkingMetadata,
  talkingReelSchema,
} from "./TalkingReel";
import t004example from "../reels/004-talking-example.json";

const FPS = 30;

const reels: { id: string; props: TipsReelProps }[] = [
  { id: "Trip2Talk-Tasmania", props: tasmania },
  { id: "Chapter99-Massage", props: massage },
];

// Duration follows the number of tips; also waits for Thai font before render.
const calculateMetadata: CalculateMetadataFunction<TipsReelProps> = async ({ props }) => {
  await fontsReady;
  return { durationInFrames: reelDurationInFrames(props, FPS) };
};

const calculateMetadata003: CalculateMetadataFunction<PhotoCaptionProps> = async ({ props }) => {
  await fontsReady;
  return { durationInFrames: photoCaptionDuration(props, FPS) };
};

export const RemotionRoot: React.FC = () => (
  <>
    {reels.map((r) => (
      <Composition
        key={r.id}
        id={r.id}
        component={TipsReel}
        schema={tipsReelSchema}
        defaultProps={r.props}
        calculateMetadata={calculateMetadata}
        durationInFrames={reelDurationInFrames(r.props, FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
    ))}
    {/* Template 003 — photo/video + white note captions */}
    {[
      { id: "T003-Trip2Talk-Spring", props: t003spring as PhotoCaptionProps },
      { id: "T003-Trip2Talk-Uluru", props: t003uluru as PhotoCaptionProps },
    ].map((r) => (
    <Composition
      key={r.id}
      id={r.id}
      component={PhotoCaptionReel}
      schema={photoCaptionSchema}
      defaultProps={r.props}
      calculateMetadata={calculateMetadata003}
      durationInFrames={photoCaptionDuration(r.props, FPS)}
      fps={FPS}
      width={1080}
      height={1920}
    />
    ))}
    {/* Template 004 — talking clip, dead air cut, word-synced captions */}
    {[{ id: "T004-Talking-Example", props: t004example as TalkingReelProps }].map((r) => (
      <Composition
        key={r.id}
        id={r.id}
        component={TalkingReel}
        schema={talkingReelSchema}
        defaultProps={r.props}
        calculateMetadata={calculateTalkingMetadata}
        durationInFrames={90}
        fps={FPS}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
