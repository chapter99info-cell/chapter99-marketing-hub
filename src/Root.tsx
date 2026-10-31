// Registers one composition per JSON file in /reels.
// Add a new reel = drop a new JSON in /reels, then add it to the list below.
import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { TipsReel, TipsReelProps, reelDurationInFrames, tipsReelSchema } from "./TipsReel";
import { fontsReady } from "./fonts";
import tasmania from "../reels/trip2talk-tasmania.json";
import massage from "../reels/chapter99-massage.json";

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
  </>
);
