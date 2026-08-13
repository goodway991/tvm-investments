import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

function superellipsePath(size, n = 5.2, steps = 160) {
  const r = size / 2;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const x = r + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = r + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${pts.join(" ")} Z`;
}

const SIZE = 1024;
const squircle = superellipsePath(SIZE);
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <defs>
    <clipPath id="squircle">
      <path d="${squircle}"/>
    </clipPath>
    <linearGradient id="base" x1="18%" y1="0%" x2="86%" y2="100%">
      <stop offset="0%" stop-color="#8b74ff"/>
      <stop offset="42%" stop-color="#5b3df5"/>
      <stop offset="100%" stop-color="#3a2ad4"/>
    </linearGradient>
    <linearGradient id="sheen" x1="50%" y1="0%" x2="50%" y2="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="plate" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="#c5b8ff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#2a1a88" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="strokeGlass" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f4f1ff"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#1a1442" flood-opacity="0.28"/>
    </filter>
    <filter id="chartShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#1a1442" flood-opacity="0.35"/>
    </filter>
  </defs>

  <path d="${squircle}" fill="url(#base)"/>
  <g clip-path="url(#squircle)">
    <rect width="${SIZE}" height="${SIZE}" fill="url(#sheen)"/>
    <ellipse cx="320" cy="180" rx="340" ry="160" fill="#ffffff" opacity="0.16" filter="url(#soft)"/>
    <rect x="118" y="126" width="788" height="772" rx="210" fill="url(#plate)" filter="url(#shadow)"/>
    <rect x="168" y="176" width="688" height="672" rx="176" fill="#ffffff" opacity="0.08"/>
    <g fill="none" stroke="url(#strokeGlass)" stroke-width="78" stroke-linecap="round" stroke-linejoin="round" filter="url(#chartShadow)">
      <path d="M214 700 L392 456 L540 578 L812 262"/>
    </g>
    <circle cx="812" cy="262" r="62" fill="#ffffff" filter="url(#chartShadow)"/>
    <path d="${squircle}" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="10"/>
    <path d="${squircle}" fill="none" stroke="#1a1442" stroke-opacity="0.18" stroke-width="8" transform="scale(0.992) translate(4.1 6)"/>
  </g>
</svg>
`;

const root = process.cwd();
const outDir = path.join(root, "public/brand");
await mkdir(outDir, { recursive: true });
const svgPath = path.join(outDir, "tvm-mark.svg");
await writeFile(svgPath, svg);

const svgBuffer = await readFile(svgPath);

async function render(size, dest) {
  const png = new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: size },
  }).render().asPng();
  await writeFile(dest, png);
  console.log(`wrote ${path.relative(root, dest)} (${size}×${size})`);
}

await render(1024, path.join(outDir, "tvm-app-icon-1024.png"));
await render(512, path.join(outDir, "tvm-app-icon-512.png"));
await render(192, path.join(outDir, "tvm-app-icon-192.png"));
await render(180, path.join(outDir, "tvm-apple-touch-180.png"));
await render(32, path.join(outDir, "tvm-favicon-32.png"));

const appDir = path.join(root, "src/app");
await copyFile(path.join(outDir, "tvm-app-icon-192.png"), path.join(appDir, "icon.png"));
await copyFile(path.join(outDir, "tvm-apple-touch-180.png"), path.join(appDir, "apple-icon.png"));
console.log("copied Next.js app icons");
