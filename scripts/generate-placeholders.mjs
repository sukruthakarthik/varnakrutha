// Generates SVG placeholder artworks referenced by src/data/seed.ts.
// Replace these with real images (see README → "Adding your artworks").
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public");

const artworks = [
  { slug: "lepakshi-temple-watercolor", title: "Lepakshi Temple", category: "heritage", folder: "heritage", w: 56, h: 38, extra: 2, scene: "temple" },
  { slug: "hampi-stone-chariot", title: "Hampi Stone Chariot", category: "heritage", folder: "heritage", w: 60, h: 45, extra: 1, scene: "chariot" },
  { slug: "meenakshi-temple-gopuram", title: "Meenakshi Temple Gopuram", category: "temple-art", folder: "temple-art", w: 45, h: 75, extra: 2, scene: "gopuram" },
  { slug: "western-ghats-monsoon", title: "Monsoon over the Western Ghats", category: "landscape", folder: "landscapes", w: 50, h: 35, extra: 0, scene: "hills" },
  { slug: "kerala-backwaters-dusk", title: "Backwaters at Dusk", category: "watercolor", folder: "watercolor", w: 38, h: 28, extra: 0, scene: "water" },
  { slug: "lotus-pond-acrylic", title: "Lotus Pond", category: "acrylic", folder: "acrylic", w: 40, h: 40, extra: 1, scene: "lotus" },
  { slug: "mysore-palace-study", title: "Mysore Palace Study", category: "sketches", folder: "sketches", w: 42, h: 30, extra: 0, scene: "sketch" },
  { slug: "rhythms-of-kolam", title: "Rhythms of Kolam", category: "other", folder: "other", w: 30, h: 30, extra: 0, scene: "kolam" },
];

const palettes = {
  temple: ["#f6e7d3", "#e7b98f", "#b86b45", "#6e3a26"],
  chariot: ["#fbe3c4", "#f0a868", "#b5553a", "#5a2e22"],
  gopuram: ["#fde9d2", "#f2a65a", "#c0462f", "#3f6b5c"],
  hills: ["#e6ece8", "#9fb8a8", "#4e7a66", "#23443a"],
  water: ["#fbd9a8", "#e98e5a", "#7b4b6a", "#22324a"],
  lotus: ["#eef2e6", "#9cc3a2", "#e59bb0", "#3e6b52"],
  sketch: ["#f7f4ee", "#d8d2c7", "#8a847a", "#3a3632"],
  kolam: ["#f3eadf", "#e2c9a6", "#9c4a2f", "#222222"],
};

function scene(kind, W, H, [c1, c2, c3, c4], variant) {
  const horizon = H * 0.68;
  const shift = variant * 40;
  switch (kind) {
    case "temple":
    case "chariot":
      return `
        <circle cx="${W * 0.75 - shift}" cy="${H * 0.28}" r="${H * 0.1}" fill="${c2}" opacity="0.8"/>
        <path d="M0 ${horizon} L${W} ${horizon} L${W} ${H} L0 ${H}Z" fill="${c3}" opacity="0.35"/>
        <g fill="${c3}">
          <rect x="${W * 0.25}" y="${horizon - H * 0.22}" width="${W * 0.5}" height="${H * 0.22}"/>
          <path d="M${W * 0.22} ${horizon - H * 0.22} L${W * 0.5} ${horizon - H * 0.42} L${W * 0.78} ${horizon - H * 0.22}Z"/>
        </g>
        <g fill="${c4}" opacity="0.85">${Array.from({ length: 7 }, (_, i) => `<rect x="${W * 0.28 + i * W * 0.07}" y="${horizon - H * 0.2}" width="${W * 0.025}" height="${H * 0.2}"/>`).join("")}</g>
        ${kind === "chariot" ? `<circle cx="${W * 0.35}" cy="${horizon}" r="${H * 0.07}" fill="none" stroke="${c4}" stroke-width="10"/><circle cx="${W * 0.65}" cy="${horizon}" r="${H * 0.07}" fill="none" stroke="${c4}" stroke-width="10"/>` : ""}`;
    case "gopuram":
      return `
        <g>${Array.from({ length: 8 }, (_, i) => {
          const tw = W * (0.7 - i * 0.07);
          const th = H * 0.075;
          return `<rect x="${(W - tw) / 2}" y="${H * 0.85 - (i + 1) * th}" width="${tw}" height="${th - 6}" fill="${i % 2 ? c3 : c2}" opacity="${0.95 - i * 0.04}"/>`;
        }).join("")}</g>
        <path d="M${W * 0.38} ${H * 0.25} Q${W * 0.5} ${H * 0.12} ${W * 0.62} ${H * 0.25}Z" fill="${c4}"/>
        <rect x="0" y="${H * 0.85}" width="${W}" height="${H * 0.15}" fill="${c4}" opacity="0.5"/>`;
    case "hills":
      return [0, 1, 2, 3].map((i) => {
        const y = H * (0.45 + i * 0.13);
        return `<path d="M0 ${y} Q${W * 0.25} ${y - H * 0.15 + shift / 4} ${W * 0.5} ${y} T${W} ${y - H * 0.05} L${W} ${H} L0 ${H}Z" fill="${[c1, c2, c3, c4][i]}" opacity="0.9"/>`;
      }).join("") + `<rect x="0" y="0" width="${W}" height="${H * 0.4}" fill="#ffffff" opacity="0.35"/>`;
    case "water":
      return `
        <circle cx="${W * 0.5}" cy="${horizon}" r="${H * 0.18}" fill="${c2}"/>
        <rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${c4}" opacity="0.85"/>
        ${Array.from({ length: 6 }, (_, i) => `<rect x="${W * 0.2 + i * 30}" y="${horizon + 20 + i * 22}" width="${W * 0.6 - i * 60}" height="4" fill="${c2}" opacity="0.5"/>`).join("")}
        <path d="M${W * 0.4} ${horizon + 40} L${W * 0.6} ${horizon + 40} L${W * 0.56} ${horizon + 60} L${W * 0.44} ${horizon + 60}Z" fill="#111"/>
        ${[0.1, 0.18, 0.85].map((x) => `<path d="M${W * x} ${horizon} L${W * x} ${horizon - H * 0.3}" stroke="#111" stroke-width="6"/><circle cx="${W * x}" cy="${horizon - H * 0.3}" r="${H * 0.06}" fill="#111"/>`).join("")}`;
    case "lotus":
      return `
        <rect x="0" y="0" width="${W}" height="${H}" fill="${c2}" opacity="0.4"/>
        ${[[0.3, 0.6], [0.65, 0.45], [0.5, 0.78]].map(([x, y]) => `
          <ellipse cx="${W * x}" cy="${H * y + 40}" rx="${W * 0.14}" ry="${H * 0.04}" fill="${c4}"/>
          ${[-40, -15, 15, 40].map((r) => `<ellipse cx="${W * x}" cy="${H * y}" rx="${W * 0.03}" ry="${H * 0.08}" fill="${c3}" transform="rotate(${r} ${W * x} ${H * y + 30})"/>`).join("")}`).join("")}`;
    case "sketch":
      return `
        <g fill="none" stroke="${c4}" stroke-width="3" opacity="0.8">
          <rect x="${W * 0.15}" y="${H * 0.45}" width="${W * 0.7}" height="${H * 0.35}"/>
          ${[0.3, 0.5, 0.7].map((x) => `<path d="M${W * (x - 0.07)} ${H * 0.45} Q${W * x} ${H * 0.2} ${W * (x + 0.07)} ${H * 0.45}"/>`).join("")}
          ${Array.from({ length: 9 }, (_, i) => `<path d="M${W * (0.2 + i * 0.075)} ${H * 0.8} L${W * (0.2 + i * 0.075)} ${H * 0.6} Q${W * (0.2375 + i * 0.075)} ${H * 0.54} ${W * (0.275 + i * 0.075)} ${H * 0.6}"/>`).join("")}
        </g>`;
    case "kolam":
    default:
      return `
        <g fill="none" stroke="${c3}" stroke-width="5">
          ${Array.from({ length: 5 }, (_, i) => `<rect x="${W / 2 - (i + 1) * 45}" y="${H / 2 - (i + 1) * 45}" width="${(i + 1) * 90}" height="${(i + 1) * 90}" rx="${(i + 1) * 20}" transform="rotate(45 ${W / 2} ${H / 2})"/>`).join("")}
        </g>
        <g fill="${c4}">${Array.from({ length: 25 }, (_, i) => `<circle cx="${W / 2 + ((i % 5) - 2) * 64}" cy="${H / 2 + (Math.floor(i / 5) - 2) * 64}" r="5"/>`).join("")}</g>`;
  }
}

function svg({ title, scene: kind, w, h }, variant) {
  const W = 1200;
  const H = Math.round((W * h) / w);
  const p = palettes[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${scene(kind, W, H, p, variant)}
  <text x="${W - 30}" y="${H - 30}" text-anchor="end" font-family="Georgia, serif" font-size="28" fill="#ffffff" opacity="0.85">${title}${variant ? ` · detail ${variant}` : ""} — sample</text>
</svg>`;
}

for (const a of artworks) {
  const dir = join(root, "artworks", "sukrutha", a.folder);
  mkdirSync(dir, { recursive: true });
  const variants = ["main", ...Array.from({ length: a.extra }, (_, i) => `detail-${i + 1}`)];
  variants.forEach((v, i) => writeFileSync(join(dir, `${a.category}-${a.slug}-${v}.svg`), svg(a, i)));
}

const profileDir = join(root, "artists", "sukrutha");
mkdirSync(profileDir, { recursive: true });
writeFileSync(
  join(profileDir, "profile.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect width="800" height="1000" fill="#f3eadf"/>
  <circle cx="400" cy="380" r="150" fill="#e2c9a6"/>
  <path d="M130 1000 Q140 640 400 620 Q660 640 670 1000Z" fill="#9c4a2f"/>
  <text x="400" y="960" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#ffffff">Artist portrait — sample</text>
</svg>`,
);

console.log("Placeholder images generated in public/artworks and public/artists.");
