# Chapter99 Marketing Hub — Reel Maker

Reels 9:16 แบบใช้ซ้ำได้ สำหรับ Trip2Talk และ Chapter99 สร้างด้วย [Remotion](https://www.remotion.dev) + Remotion Agent Skills (`.agents/skills`)

## ทำรีลใหม่
1. ก๊อปไฟล์ใน `reels/` แล้วแก้ข้อความ (hook, tips, cta, สี accent)
2. ถ้ามีรูป ใส่ไว้ใน `public/photos/` แล้วใส่ชื่อไฟล์ใน `"photo"` ของแต่ละ tip
3. ลงทะเบียนไฟล์ใหม่ใน `src/Root.tsx` (ในรายการ `reels`)
4. Render: `npx remotion render <Composition-ID> out/<name>.mp4`

ดูตัวอย่างแบบสดและแก้ค่าได้ที่ `npm run dev` (Remotion Studio)

## โครงสร้าง
- `src/TipsReel.tsx` — เทมเพลต: Hook → การ์ดเคล็ดลับเป็นข้อ ๆ → CTA
- `src/fonts.ts` — ฟอนต์ Kanit (ไทย + อังกฤษ) โหลดจาก `public/fonts`
- `reels/*.json` — เนื้อหาของรีลแต่ละตัว

## หมายเหตุ
- Remotion ฟรีสำหรับทีมไม่เกิน 3 คน (ดู remotion.pro/license)
- บนเครื่องที่ไม่มี Chrome ให้ใส่ `--browser-executable=<path-to-chrome>`
