# Chapter99 Marketing Hub — Reel Maker

Reels 9:16 แบบใช้ซ้ำได้ สำหรับ Trip2Talk และ Chapter99 สร้างด้วย [Remotion](https://www.remotion.dev) + Remotion Agent Skills (`.agents/skills`)

## ทำรีลใหม่
1. ก๊อปไฟล์ใน `reels/` แล้วแก้ข้อความ (hook, tips, cta, สี accent)
2. ถ้ามีรูป ใส่ไว้ใน `public/photos/` แล้วใส่ชื่อไฟล์ใน `"photo"` ของแต่ละ tip
3. ลงทะเบียนไฟล์ใหม่ใน `src/Root.tsx` (ในรายการ `reels`)
4. Render: `npx remotion render <Composition-ID> out/<name>.mp4`

ดูตัวอย่างแบบสดและแก้ค่าได้ที่ `npm run dev` (Remotion Studio)

## เทมเพลต
- **001/002 TipsReel** (`src/TipsReel.tsx`): พื้นลายจุด + การ์ดเคล็ดลับเป็นข้อ ๆ → CTA ใช้กับ `reels/trip2talk-tasmania.json`, `reels/chapter99-massage.json`
- **003 PhotoCaptionReel** (`src/PhotoCaptionReel.tsx`): รูปหรือวิดีโอเต็มจอ + กล่องข้อความสีขาวเล็ก ๆ ค่อย ๆ พิมพ์ขึ้นทีละกล่อง แต่ละฉากกำหนด `photo` (public/photos) หรือ `video` (public/videos), `seconds` และ `captions` (text, at = วินาที, x/y = % ตำแหน่ง, size) ตัวอย่าง: `reels/003-trip2talk-spring.json`

- **004 TalkingReel** (`src/TalkingReel.tsx`): คลิปพูดหน้ากล้อง ตัดช่วงเงียบอัตโนมัติ + ซับใหญ่ตรงตามคำพูด (คำที่พูดอยู่เปลี่ยนเป็นสี accent) ตัวอย่าง: `reels/004-talking-example.json`

## ทำรีลพูด (004) — ตัดช่วงเงียบ + ซับอัตโนมัติ
1. วางคลิปใน `public/recordings/` (เช่น `my-clip.mp4`)
2. `npm run prep -- public/recordings/my-clip.mp4`
   - ตัดช่วงเงียบ (ffmpeg ที่มากับ Remotion ไม่ต้องลงเพิ่ม)
   - ถอดเสียงภาษาไทยด้วย whisper.cpp ได้ timestamp รายคำ
   - ได้ไฟล์ `public/edits/my-clip.json`
   - รันครั้งแรกจะโหลด whisper.cpp + model `large-v3-turbo` (~1.6 GB) ไว้ใน `.whisper/` ครั้งเดียว
   - ตัวเลือก: `--lang en --model base.en` (อังกฤษ), `--model medium` (เบากว่า), `--no-transcribe` (ตัดเงียบอย่างเดียว), `--min-silence 0.5`, `--pad 0.12`
3. ใส่ `{ "edit": "my-clip.json" }` ใน `clips` ของ reel JSON (ใส่หลายคลิปต่อกันได้)
4. `npm run dev` ดูตัวอย่าง → `npx remotion render T004-Talking-Example out/my-clip.mp4`

สี ฟอนต์ และสไตล์ของแต่ละแบรนด์อยู่ที่ `brand/trip2talk/BRAND.md` และ `brand/chapter99/BRAND.md`
เสียงเอฟเฟกต์ → `public/sound pack/`, เพลง → `public/music pack/`, คลิปอัดหน้าจอ → `public/screen-recordings/` (ไฟล์คลิปดิบไม่ขึ้น Git)

## โครงสร้าง
- `src/TipsReel.tsx` — เทมเพลต: Hook → การ์ดเคล็ดลับเป็นข้อ ๆ → CTA
- `src/fonts.ts` — ฟอนต์ Kanit (ไทย + อังกฤษ) โหลดจาก `public/fonts`
- `reels/*.json` — เนื้อหาของรีลแต่ละตัว

## หมายเหตุ
- Remotion ฟรีสำหรับทีมไม่เกิน 3 คน (ดู remotion.pro/license)
- บนเครื่องที่ไม่มี Chrome ให้ใส่ `--browser-executable=<path-to-chrome>`
