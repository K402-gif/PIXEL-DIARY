// Node 20+, sin dependencias. Genera public/data.json con noticias (RSS) y ofertas (Steam, Epic).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const OUT = process.env.OUT || "public/data.json";
const CC = process.env.STEAM_CC || "es";            // país para precios de Steam y Epic
const LOCALE = process.env.EPIC_LOCALE || "es-ES";
const UA = "PixelDiarioBot/1.0 (cambia esto por tu web o email)";
// Parámetros de afiliado opcionales, p. ej. AFF_EPIC="epic_creator_id=TUCODIGO"
const AFF = { Steam: process.env.AFF_STEAM || "", Epic: process.env.AFF_EPIC || "" };

// Fuentes RSS. Comprueba que cada URL sigue activa; las que fallen se omiten sin romper el resto.
const FEEDS = [
  { name: "Pure Xbox", url: "https://www.purexbox.com/feeds/latest", platform: "Xbox" },
  { name: "PlayStation Blog", url: "https://blog.playstation.com/feed/", platform: "PlayStation" },
  { name: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest", platform: "Nintendo" },
  { name: "PC Gamer", url: "https://www.pcgamer.com/rss/", platform: "PC" },
  { name: "Eurogamer", url: "https://www.eurogamer.net/feed", platform: "General" },
  { name: "GamesRadar", url: "https://www.gamesradar.com/rss/", platform: "General" },
  { name: "Dot Esports", url: "https://dotesports.com/feed", platform: "General", topic: "esports" },
  { name: "Esports Insider", url: "https://esportsinsider.com/feed", platform: "General", topic: "esports" },
];

const get = async (url, json) => {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return json ? r.json() : r.text();
};
const tag = (url, qs) => (qs ? url + (url.includes("?") ? "&" : "?") + qs : url);
const clean = (s = "") => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#8217;|&#039;|&#39;/g, "’").replace(/&#8211;/g, "–").replace(/\s+/g, " ").trim();
const pick = (b, t) => (b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i")) || [])[1] || "";

function parseFeed(xml, f) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return blocks.slice(0, 25).map((b) => {
    const title = clean(pick(b, "title"));
    const link = clean(pick(b, "link")) || (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    const date = new Date(clean(pick(b, "pubDate") || pick(b, "published") || pick(b, "updated")));
    const text = clean(pick(b, "description") || pick(b, "summary")).slice(0, 190);
    const topic = f.topic || (/review|reseña|análisis|analisis/i.test(title) ? "reviews" : "news");
    return { title, url: link, date: isNaN(date) ? null : date.toISOString(), text, source: f.name, platform: f.platform, topic };
  }).filter((x) => x.title && /^https?:/.test(x.url));
}

async function steam() {
  const j = await get(`https://store.steampowered.com/api/featuredcategories?cc=${CC}&l=spanish`, true);
  return (j.specials?.items || []).filter((i) => i.discounted).slice(0, 24).map((i) => ({
    store: "Steam", title: i.name, pct: i.discount_percent, old: i.original_price / 100,
    price: i.final_price / 100, currency: i.currency, img: i.header_image || i.large_capsule_image,
    url: tag(`https://store.steampowered.com/app/${i.id}/`, AFF.Steam),
    ends: i.discount_expiration ? new Date(i.discount_expiration * 1000).toISOString() : null,
  }));
}

async function epic() {
  const j = await get(`https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${LOCALE}&country=${CC.toUpperCase()}&allowCountries=${CC.toUpperCase()}`, true);
  const els = j?.data?.Catalog?.searchStore?.elements || [];
  const out = { now: [], soon: [] };
  for (const e of els) {
    const slug = (e.offerMappings?.[0]?.pageSlug || e.productSlug || e.urlSlug || "").replace(/\/home$/, "");
    if (!slug) continue;
    const img = (e.keyImages || []).find((k) => /Wide|Thumbnail/i.test(k.type))?.url || e.keyImages?.[0]?.url;
    const url = tag(`https://store.epicgames.com/${LOCALE}/p/${slug}`, AFF.Epic);
    const cur = e.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
    const nxt = e.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
    if (cur && e.price?.totalPrice?.discountPrice === 0) out.now.push({ store: "Epic", title: e.title, img, url, ends: cur.endDate });
    else if (nxt) out.soon.push({ store: "Epic", title: e.title, img, url, starts: nxt.startDate });
  }
  return out;
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch {}
  const log = [];
  const run = async (name, fn, fallback) => {
    try { const r = await fn(); log.push(`OK ${name}`); return r; }
    catch (e) { log.push(`FALLÓ ${name}: ${e.message}`); return fallback; }
  };
  const feeds = await Promise.all(FEEDS.map((f) => run(f.name, async () => parseFeed(await get(f.url), f), [])));
  let items = feeds.flat();
  if (!items.length) items = prev.items || [];           // conserva lo anterior si todo falla
  const seen = new Set();
  items = items.filter((i) => !seen.has(i.url) && seen.add(i.url))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 200);
  const steamDeals = await run("Steam", steam, null);
  const epicDeals = await run("Epic", epic, null);
  const data = {
    generatedAt: new Date().toISOString(), items,
    steam: steamDeals?.length ? steamDeals : prev.steam || [],
    epic: epicDeals && (epicDeals.now.length || epicDeals.soon.length) ? epicDeals : prev.epic || { now: [], soon: [] },
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 1));
  console.log(log.join("\n"), `\n${items.length} noticias, ${data.steam.length} ofertas Steam, ${data.epic.now.length} gratis Epic`);
}
main();
