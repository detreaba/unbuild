import type { AnalysisContext } from "./analyzer-types";

export async function analyzeProduct(url: string): Promise<AnalysisContext> {
  // Normalize URL
  if (!url.startsWith("http")) url = "https://" + url;

  // Fetch the product page — try Playwright first (bypasses anti-bot), fall back to fetch
  let html = await fetchWithPlaywright(url);
  if (!html) html = await fetchPage(url);
  if (!html) {
    // Fallback: analyze based on URL pattern and product identifier
    const productId = extractProductId(url);
    const fallbackContext = [
      `# Product Analysis (from URL only — page blocked by anti-bot protection)`,
      `**URL:** ${url}`,
      `**Product ID:** ${productId || "unknown"}`,
      `**Platform:** ${detectPlatform(url)}`,
      ``,
      `The product page could not be fetched (likely anti-bot protection).`,
      `Analyze this product based on:`,
      `1. The URL structure and platform (Amazon, eBay, etc.)`,
      `2. The product ID (search for it to find specs)`,
      `3. Your knowledge of similar products in this category`,
      `4. Provide a general teardown blueprint that the user can refine`,
    ].join("\n");

    return {
      inputType: "product",
      formattedContext: fallbackContext,
      metadata: { title: `Product ${productId || url}`, description: "Analyzed from URL (page blocked)" },
    };
  }

  // Extract product metadata
  const title = extractMeta(html, "og:title") || extractTag(html, "title") || url;
  const description = extractMeta(html, "og:description") || extractMeta(html, "description") || "";
  const image = extractMeta(html, "og:image") || "";
  const price = extractPrice(html);
  const specs = extractSpecifications(html);
  const features = extractFeatures(html);

  // Clean HTML for LLM context
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/<!--[\s\S]*?-->/g, "");

  if (cleanHtml.length > 20000) {
    cleanHtml = cleanHtml.slice(0, 20000) + "\n<!-- truncated -->";
  }

  // Build context
  const parts: string[] = [];
  parts.push(`# Product Analysis: ${url}`);
  parts.push(`**Name:** ${title}`);
  parts.push(`**Description:** ${description}`);
  if (price) parts.push(`**Price:** ${price}`);
  if (image) parts.push(`**Image:** ${image}`);

  if (specs.length > 0) {
    parts.push("\n## Specifications");
    for (const spec of specs) parts.push(`- ${spec}`);
  }

  if (features.length > 0) {
    parts.push("\n## Features");
    for (const feature of features) parts.push(`- ${feature}`);
  }

  parts.push("\n## Product Page HTML (cleaned)");
  parts.push("```html");
  parts.push(cleanHtml);
  parts.push("```");

  let context = parts.join("\n");
  if (context.length > 40000) {
    context = context.slice(0, 40000) + "\n<!-- truncated -->";
  }

  return {
    inputType: "product",
    formattedContext: context,
    metadata: { title, description, price, image, specsCount: specs.length },
  };
}

async function fetchWithPlaywright(url: string): Promise<string | null> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    const html = await page.content();
    await browser.close();
    return html;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,*/*",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function extractMeta(html: string, name: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i")
  );
  if (match) return match[1];
  const match2 = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`, "i")
  );
  return match2 ? match2[1] : null;
}

function extractPrice(html: string): string | null {
  // Look for price patterns
  const patterns = [
    /\$[\d,]+\.?\d{0,2}/,
    /€[\d,]+\.?\d{0,2}/,
    /£[\d,]+\.?\d{0,2}/,
    /price['":\s]*["']?\$?[\d,]+\.?\d{0,2}/i,
  ];
  for (const p of patterns) {
    const match = html.match(p);
    if (match) return match[0];
  }
  return null;
}

function extractSpecifications(html: string): string[] {
  const specs: string[] = [];
  // Look for spec tables
  const tableMatch = html.match(
    /<table[^>]*(?:spec|detail|feature|tech)[^>]*>([\s\S]*?)<\/table>/gi
  );
  if (tableMatch) {
    for (const table of tableMatch) {
      const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const row of rows.slice(0, 30)) {
        const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        const texts = cells.map((c) =>
          c.replace(/<[^>]+>/g, "").trim()
        ).filter(Boolean);
        if (texts.length >= 2) {
          specs.push(`${texts[0]}: ${texts.slice(1).join(", ")}`);
        }
      }
    }
  }

  // Look for definition lists
  const dlMatch = html.match(/<dl[^>]*>([\s\S]*?)<\/dl>/gi) || [];
  for (const dl of dlMatch) {
    const terms = dl.match(/<dt[^>]*>([\s\S]*?)<\/dt>/gi) || [];
    const defs = dl.match(/<dd[^>]*>([\s\S]*?)<\/dd>/gi) || [];
    for (let i = 0; i < Math.min(terms.length, defs.length, 30); i++) {
      const term = terms[i].replace(/<[^>]+>/g, "").trim();
      const def = defs[i].replace(/<[^>]+>/g, "").trim();
      if (term && def) specs.push(`${term}: ${def}`);
    }
  }

  return specs.slice(0, 50);
}

function extractFeatures(html: string): string[] {
  const features: string[] = [];
  // Look for feature lists
  const listMatch = html.match(
    /<(?:ul|ol)[^>]*(?:feature|benefit|highlight)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi
  );
  if (listMatch) {
    for (const list of listMatch) {
      const items = list.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const item of items.slice(0, 20)) {
        const text = item.replace(/<[^>]+>/g, "").trim();
        if (text && text.length > 5) features.push(text);
      }
    }
  }
  return features.slice(0, 30);
}

function extractProductId(url: string): string | null {
  // Amazon ASIN
  const asin = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (asin) return `ASIN:${asin[1]}`;
  // eBay item
  const ebay = url.match(/\/itm\/(\d+)/);
  if (ebay) return `eBay:${ebay[1]}`;
  // AliExpress item
  const ali = url.match(/\/item\/(\d+)/);
  if (ali) return `AliExpress:${ali[1]}`;
  // Generic product path
  const generic = url.match(/\/products?\/([^/?#]+)/i);
  if (generic) return generic[1];
  return null;
}

function detectPlatform(url: string): string {
  if (url.includes("amazon")) return "Amazon";
  if (url.includes("ebay")) return "eBay";
  if (url.includes("aliexpress")) return "AliExpress";
  if (url.includes("etsy")) return "Etsy";
  if (url.includes("walmart")) return "Walmart";
  if (url.includes("bestbuy")) return "Best Buy";
  if (url.includes("thingiverse")) return "Thingiverse";
  return "Unknown";
}
