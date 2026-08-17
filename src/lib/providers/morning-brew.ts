import type { BriefArticleBlock, MarketEvent } from "@/types";

export const MORNING_BREW_ISSUE_URL = "https://www.morningbrew.com/issues/latest";
export const MORNING_BREW_SUBSCRIBE_URL = "https://www.morningbrew.com/subscribe";
export const MORNING_BREW_HOME_URL = "https://www.morningbrew.com";
const FEED_URL = "https://www.morningbrew.com/feed.xml";

export type MorningBrewStory = {
  title: string;
  url: string;
  teaser: string;
  published: string;
  category: string;
  author: string;
  imageUrl?: string;
  imageCaption?: string;
  blocks: BriefArticleBlock[];
};

const PRIORITY =
  /econom|market|tech|financ|invest|stock|business|ipo|fed|bank|trade|earn|ai\b|semicon|energy|policy|legal/i;
const SKIP = /quiz|crossword|puzzle|horoscope|recipe/i;

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(value: string) {
  return decode(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</${name}>`, "i"),
  );
  return decode(match?.[1] ?? "").trim();
}

function tags(block: string, name: string) {
  return [...block.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</${name}>`, "gi"))].map(
    (match) => decode(match[1] ?? "").trim(),
  );
}

function cleanUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.search = "";
    if (url.hostname === "morningbrew.com") url.hostname = "www.morningbrew.com";
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function allowedImage(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return "";
    const host = url.hostname.replace(/^www\./, "");
    if (host === "morningbrew.com" || host.endsWith(".morningbrew.com")) return url.toString();
    return "";
  } catch {
    return "";
  }
}

function attr(tagHtml: string, name: string) {
  const match = tagHtml.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function isJunkText(text: string) {
  return (
    !text ||
    /become smarter in just 5 minutes/i.test(text) ||
    /subscribe to morning brew/i.test(text) ||
    /sponsored by/i.test(text) ||
    /this is a paid advertisement/i.test(text) ||
    /presented by/i.test(text)
  );
}

function parseList(html: string) {
  return [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((item) => item && !isJunkText(item));
}

export function parseArticleHtml(html: string): {
  imageUrl?: string;
  imageCaption?: string;
  blocks: BriefArticleBlock[];
} {
  let markup = decode(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  markup = markup.replace(/Become smarter in just 5 minutes[\s\S]*$/i, "");

  const imageTag = markup.match(/<img\b[^>]*>/i)?.[0] ?? "";
  const imageUrl = allowedImage(attr(imageTag, "src"));
  const caption = stripTags(markup.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? "");

  const blocks: BriefArticleBlock[] = [];
  for (const match of markup.matchAll(/<(h2|p|ul)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tagName = match[1].toLowerCase();
    const inner = match[2];
    if (tagName === "ul") {
      const items = parseList(inner);
      if (items.length) blocks.push({ type: "list", items });
      continue;
    }
    const text = stripTags(inner);
    if (!text || isJunkText(text)) continue;
    if (tagName === "h2") blocks.push({ type: "heading", text });
    else blocks.push({ type: "paragraph", text });
  }

  return {
    imageUrl: imageUrl || undefined,
    imageCaption: caption || undefined,
    blocks,
  };
}

function wordCount(blocks: BriefArticleBlock[]) {
  return blocks.reduce((total, block) => {
    if (block.type === "list") return total + block.items.join(" ").split(/\s+/).length;
    return total + block.text.split(/\s+/).filter(Boolean).length;
  }, 0);
}

function readMinutes(blocks: BriefArticleBlock[]) {
  return Math.max(1, Math.round(wordCount(blocks) / 200) || 1);
}

function teaserOf(text: string) {
  const cleaned = stripTags(text)
    .replace(/Become smarter in just 5 minutes.*$/i, "")
    .replace(/Subscribe to Morning Brew.*$/i, "")
    .trim();
  if (cleaned.length <= 220) return cleaned;
  const cut = cleaned.slice(0, 217);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 140 ? lastSpace : 217).trim()}…`;
}

function scoreStory(story: MorningBrewStory) {
  if (SKIP.test(`${story.title} ${story.category}`)) return -1;
  const hay = `${story.category} ${story.title}`;
  return PRIORITY.test(hay) ? 2 : 1;
}

function parseItems(xml: string): MorningBrewStory[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const block = match[1];
    const categories = tags(block, "category").filter((item) => item && item !== "Morning Brew");
    const guid = tag(block, "guid");
    const link = tag(block, "link");
    const publishedRaw = tag(block, "pubDate");
    const published = publishedRaw ? new Date(publishedRaw).toISOString() : "";
    const encoded = tag(block, "content:encoded");
    const article = parseArticleHtml(encoded);
    const teaser = teaserOf(tag(block, "description"));
    return {
      title: stripTags(tag(block, "title")),
      url: cleanUrl(guid || link),
      teaser,
      published: Number.isNaN(Date.parse(published)) ? "" : published,
      category: categories[0] || "Business",
      author: stripTags(tag(block, "dc:creator")),
      imageUrl: article.imageUrl,
      imageCaption: article.imageCaption,
      blocks:
        article.blocks.length > 0
          ? article.blocks
          : teaser
            ? [{ type: "paragraph" as const, text: teaser }]
            : [],
    };
  }).filter((story) => story.title && story.url.startsWith("https://"));
}

export async function fetchMorningBrewStories(limit = 5): Promise<MorningBrewStory[]> {
  const response = await fetch(FEED_URL, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "TVMInvestments/1.0 (+https://tvminvest.com)",
    },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) {
    throw new Error(`Morning Brew feed ${response.status}`);
  }
  const xml = await response.text();
  const ranked = parseItems(xml)
    .map((story) => ({ story, score: scoreStory(story) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.story.published || "").localeCompare(a.story.published || "");
    });
  const seen = new Set<string>();
  const stories: MorningBrewStory[] = [];
  for (const row of ranked) {
    if (seen.has(row.story.url)) continue;
    seen.add(row.story.url);
    stories.push(row.story);
    if (stories.length >= limit) break;
  }
  return stories;
}

function impactFromText(text: string): MarketEvent["impact"] {
  const t = text.toLowerCase();
  const bullish = ["rally", "surge", "beats", "record", "eases", "cut rates", "cool inflation", "ipo"];
  const bearish = ["plunge", "crash", "misses", "war", "tariff", "selloff", "sued", "lawsuit", "slowdown"];
  const up = bullish.filter((word) => t.includes(word)).length;
  const down = bearish.filter((word) => t.includes(word)).length;
  if (up > down) return "bullish";
  if (down > up) return "bearish";
  return "mixed";
}

function regionFromStory(story: MorningBrewStory): MarketEvent["region"] {
  const t = `${story.category} ${story.title} ${story.teaser}`.toLowerCase();
  if (
    /tech|ai\b|software|semicon|nvidia|apple|google|meta|openai|anthropic|chip|startup/.test(t)
  ) {
    return "Tech";
  }
  if (
    t.includes("fed") ||
    t.includes("wall street") ||
    t.includes("nasdaq") ||
    t.includes("s&p") ||
    t.includes("dow ") ||
    t.includes("u.s") ||
    /\bus economy\b/.test(t)
  ) {
    return "US";
  }
  if (/china|europe|uk\b|eu\b|global|japan|india/.test(t)) return "Global";
  return "US";
}

export function storiesToMarketEvents(stories: MorningBrewStory[]): MarketEvent[] {
  return stories.map((story) => ({
    title: story.title,
    region: regionFromStory(story),
    impact: impactFromText(`${story.title} ${story.teaser}`),
    summary: story.teaser || story.title,
    detail: story.blocks
      .flatMap((block) => (block.type === "paragraph" ? [block.text] : []))
      .join("\n\n") || story.teaser || story.title,
    source: "Morning Brew",
    url: story.url,
    date: (story.published || new Date().toISOString()).slice(0, 10),
    author: story.author || undefined,
    category: story.category || undefined,
    imageUrl: story.imageUrl,
    imageCaption: story.imageCaption,
    readMinutes: readMinutes(story.blocks),
    blocks: story.blocks,
  }));
}

export async function fetchMorningBrewMarketEvents(limit = 6): Promise<MarketEvent[]> {
  try {
    const stories = await fetchMorningBrewStories(limit);
    return storiesToMarketEvents(stories);
  } catch (error) {
    console.error("Morning Brew market events error:", error);
    return [];
  }
}

export function mergeNewsSources(
  preferred: MarketEvent[],
  fallback: MarketEvent[],
  limit = 6,
): MarketEvent[] {
  const out: MarketEvent[] = [];
  const seen = new Set<string>();
  for (const event of [...preferred, ...fallback]) {
    const key = event.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(event);
    if (out.length >= limit) break;
  }
  return out;
}
