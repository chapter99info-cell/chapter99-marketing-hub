#!/usr/bin/env node
// Prep a talking clip for TalkingReel (template 004):
//   1) find dead air (adaptive threshold via ffmpeg loudnorm + silencedetect)
//   2) transcribe with whisper.cpp → word-level captions (Thai by default)
//   3) write public/edits/<clip-name>.json  { source, duration, segments, captions }
//
// Usage:
//   npm run prep -- public/recordings/my-clip.mp4
//   npm run prep -- public/recordings/my-clip.mp4 --lang en --model base.en
//   npm run prep -- public/recordings/my-clip.mp4 --no-transcribe   (silence cut only)
// Options: --lang th|en|auto  --model large-v3-turbo|medium|small|base.en ...
//          --min-silence 0.5 (s)  --pad 0.12 (s)
//
// First run downloads whisper.cpp (~few MB) + the model (large-v3-turbo ≈ 1.6 GB) into .whisper/
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { keepSegments, parseDuration, parseLoudnormThreshold, parseSilences } from "./lib/silence.mjs";

const WHISPER_VERSION = "1.5.5";
const WHISPER_DIR = path.resolve(".whisper");

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const VALUE_FLAGS = new Set(["--lang", "--model", "--min-silence", "--pad"]);
const input = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
if (!input || !existsSync(input)) {
  console.error("❌ ใส่ path ของคลิปด้วย เช่น: npm run prep -- public/recordings/my-clip.mp4");
  process.exit(1);
}
const lang = flag("lang", "th");
const model = flag("model", lang === "en" ? "base.en" : "large-v3-turbo");
const minSilence = Number(flag("min-silence", "0.5"));
const pad = Number(flag("pad", "0.12"));
const doTranscribe = !argv.includes("--no-transcribe");

// Path relative to /public so Remotion can staticFile() it.
const publicRel = path.relative(path.resolve("public"), path.resolve(input)).split(path.sep).join("/");
if (publicRel.startsWith("..")) {
  console.error("❌ คลิปต้องอยู่ในโฟลเดอร์ public/ (เช่น public/recordings/)");
  process.exit(1);
}
const name = path.basename(input, path.extname(input));

// ---------- ffmpeg (bundled with Remotion, no separate install needed) ----------
const ffmpeg = (args) => {
  const win = process.platform === "win32";
  // On Windows we go through the shell, so quote args (paths often contain spaces).
  const q = (a) => (win && /[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  const r = spawnSync(win ? "npx.cmd" : "npx", ["remotion", "ffmpeg", ...args].map(q), {
    encoding: "utf8",
    shell: win,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr?.slice(-2000)}`);
  return r.stderr; // ffmpeg prints analysis to stderr
};

// ---------- 1) silence → keep segments ----------
console.log(`🎬 ${publicRel}`);
const loud = ffmpeg(["-hide_banner", "-i", input, "-map", "0:a:0", "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
const duration = parseDuration(loud);
if (!duration) throw new Error("อ่านความยาวคลิปไม่ได้");
const thresh = parseLoudnormThreshold(loud) ?? -40;
const sd = ffmpeg(["-hide_banner", "-i", input, "-map", "0:a:0", "-af", `silencedetect=noise=${thresh}dB:d=${minSilence}`, "-f", "null", "-"]);
const silences = parseSilences(sd, duration);
const segments = keepSegments(silences, duration, { pad });
const kept = segments.reduce((s, k) => s + k.end - k.start, 0);
console.log(`✂️  ตัดช่วงเงียบ: ${duration.toFixed(1)}s → ${kept.toFixed(1)}s (${segments.length} ช่วง, threshold ${thresh}dB)`);

// ---------- 2) transcribe ----------
let captions = [];
if (doTranscribe) {
  await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false });
  await downloadWhisperModel({ model, folder: WHISPER_DIR, printOutput: true });

  // whisper.cpp needs 16 kHz mono WAV
  const wav = path.join(WHISPER_DIR, `${name}.16k.wav`);
  ffmpeg(["-hide_banner", "-y", "-i", input, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
  console.log(`📝 ถอดเสียง (${model}, ภาษา ${lang}) ...`);
  const out = await transcribe({
    inputPath: wav,
    whisperPath: WHISPER_DIR,
    whisperCppVersion: WHISPER_VERSION,
    model,
    tokenLevelTimestamps: true,
    language: lang,
    onProgress: (p) => process.stdout.write(`\r   ${Math.round(p * 100)}%`),
  });
  process.stdout.write("\n");
  rmSync(wav, { force: true });
  // Timestamps stay relative to the ORIGINAL file; the template maps them through the cuts.
  captions = toCaptions({ whisperCppOutput: out }).captions;
  console.log(`💬 ได้ ${captions.length} คำ/โทเค็น`);
}

// ---------- 3) write edit file ----------
mkdirSync("public/edits", { recursive: true });
const outPath = path.join("public", "edits", `${name}.json`);
writeFileSync(outPath, JSON.stringify({ source: publicRel, duration, segments, captions }, null, 2));
console.log(`✅ เขียนไฟล์ ${outPath.split(path.sep).join("/")}`);
console.log(`   ใช้ใน reel JSON: { "clips": [{ "edit": "${name}.json" }] }`);
