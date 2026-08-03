import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

// UKATTAロゴマーク: 右肩上がりの3本バー + 合格を示す光点（LPと同じモチーフ）
function iconSvg({ size, padding, maskable }) {
  const bg = maskable ? "#2B5FD9" : "none";
  const bars = [
    { x: 0.16, y: 0.62, h: 0.24, opacity: 0.6 },
    { x: 0.42, y: 0.42, h: 0.44, opacity: 0.85 },
    { x: 0.68, y: 0.2, h: 0.66, opacity: 1 },
  ];
  const barWidth = 0.16;
  const s = size;
  const inner = s - padding * 2;

  const barsSvg = bars
    .map(
      (b) =>
        `<rect x="${padding + b.x * inner}" y="${padding + b.y * inner}" width="${
          barWidth * inner
        }" height="${b.h * inner}" rx="${0.03 * inner}" fill="#FFFFFF" opacity="${b.opacity}" />`
    )
    .join("");

  const dotCx = padding + (bars[2].x + barWidth / 2) * inner;
  const dotCy = padding + bars[2].y * inner - 0.07 * inner;

  return `
<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  ${maskable ? `<rect width="${s}" height="${s}" fill="${bg}" />` : `<rect width="${s}" height="${s}" rx="${0.22 * s}" fill="#2B5FD9" />`}
  ${barsSvg}
  <circle cx="${dotCx}" cy="${dotCy}" r="${0.055 * inner}" fill="#FFFFFF" />
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, padding: 34, maskable: false },
  { file: "icon-512.png", size: 512, padding: 90, maskable: false },
  { file: "icon-maskable-512.png", size: 512, padding: 130, maskable: true },
  { file: "apple-touch-icon.png", size: 180, padding: 30, maskable: false },
];

for (const t of targets) {
  const svg = iconSvg(t);
  await sharp(Buffer.from(svg)).png().toFile(join(publicDir, t.file));
  console.log(`generated ${t.file}`);
}
