// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { keepSegments, parseDuration, parseLoudnormThreshold, parseSilences } from "./silence.mjs";

test("parseDuration reads ffmpeg header", () => {
  assert.equal(parseDuration("  Duration: 00:01:02.50, start: 0.000000"), 62.5);
  assert.equal(parseDuration("no header"), null);
});

test("parseLoudnormThreshold reads input_thresh", () => {
  const out = `[Parsed_loudnorm_0 @ 0x1]\n{\n\t"input_i" : "-23.10",\n\t"input_thresh" : "-33.40"\n}`;
  assert.equal(parseLoudnormThreshold(out), -33.4);
  assert.equal(parseLoudnormThreshold("nothing"), null);
});

test("parseSilences pairs start/end and closes a trailing silence", () => {
  const out = [
    "[silencedetect @ 0x1] silence_start: 0",
    "[silencedetect @ 0x1] silence_end: 1.5 | silence_duration: 1.5",
    "[silencedetect @ 0x1] silence_start: 4.2",
    "[silencedetect @ 0x1] silence_end: 5 | silence_duration: 0.8",
    "[silencedetect @ 0x1] silence_start: 9.1",
  ].join("\n");
  assert.deepEqual(parseSilences(out, 10), [
    { start: 0, end: 1.5 },
    { start: 4.2, end: 5 },
    { start: 9.1, end: 10 },
  ]);
});

test("keepSegments keeps speech with padding", () => {
  const silences = [
    { start: 0, end: 1.5 },
    { start: 4.2, end: 5 },
    { start: 9.1, end: 10 },
  ];
  assert.deepEqual(keepSegments(silences, 10, { pad: 0.1 }), [
    { start: 1.4, end: 4.3 },
    { start: 4.9, end: 9.2 },
  ]);
});

test("keepSegments merges pieces that overlap after padding and drops tiny ones", () => {
  const silences = [
    { start: 2, end: 2.1 }, // tiny gap → merged back together
    { start: 5, end: 8 },
    { start: 8.1, end: 10 }, // leaves a 0.1s blip → dropped
  ];
  assert.deepEqual(keepSegments(silences, 10, { pad: 0.12, minKeep: 0.3 }), [{ start: 0, end: 5.12 }]);
});

test("keepSegments with no silence keeps the whole file", () => {
  assert.deepEqual(keepSegments([], 7.5), [{ start: 0, end: 7.5 }]);
});
