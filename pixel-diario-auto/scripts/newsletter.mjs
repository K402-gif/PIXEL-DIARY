// Genera el boletín semanal desde public/data.json y lo envía a Buttondown (borrador por defecto).
import { readFile, writeFile, mkdir } from "node:fs/promises";
const SITE = process.env.SITE_URL || "https://TU-DOMINIO";
const KEY = process.env.BUTTONDOWN_API_KEY || "";
const SEND = process.env.NEWSLETTER_SEND === "1";   // con "1" se envía; si no, queda como borrador
const DATA = process.env.DATA || "public/data.json";
const d = JSON.parse(await readFile(DATA, "utf8"));
const m = (n, c) => `${n.toFixed(2)} ${c}`;
const steam = [...(d.steam || [])].sort((a, b) => b.pct - a.pct).slice(0, 8);
const free = d.epic?.now || [];
const news = (d.items || []).filter((i) => i.topic !== "esports").slice(0, 5);
if (!steam.length && !free.length && !news.length) { console.log("Sin datos; no se genera boletín."); process.exit(0); }

let md = "# Las mejores ofertas de la semana\n\n";
if (free.length) md += "## Gratis en Epic Games\n\n" + free.map((g) => `- [${g.title}](${g.url})`).join("\n") + "\n\n";
if (steam.length) md += "## Rebajas en Steam\n\n" + steam.map((g) => `- [${g.title}](${g.url}) — **−${g.pct} %**, ${m(g.price, g.currency)} (antes ${m(g.old, g.currency)})`).join("\n") + "\n\n";
if (news.length) md += "## Para leer\n\n" + news.map((n) => `- [${n.title}](${n.url}) · ${n.source}`).join("\n") + "\n\n";
md += `Más en ${SITE}\n\n*Algunos enlaces pueden ser de afiliado. Los precios pueden cambiar.*\n`;
const subject = `Ofertas de videojuegos · semana del ${new Date().toLocaleDateString("es", { day: "numeric", month: "long" })}`;

await mkdir("out", { recursive: true });
await writeFile("out/boletin.md", `# ${subject}\n\n` + md);
console.log("Boletín generado en out/boletin.md");
if (!KEY) { console.log("Sin BUTTONDOWN_API_KEY: no se envía."); process.exit(0); }
const r = await fetch("https://api.buttondown.com/v1/emails", {
  method: "POST",
  headers: { Authorization: `Token ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ subject, body: md, status: SEND ? "about_to_send" : "draft" }),
});
console.log(`Buttondown: ${r.status} (${SEND ? "enviado" : "borrador"})`);
if (!r.ok) { console.log(await r.text()); process.exit(1); }
