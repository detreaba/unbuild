export interface WebsiteAnalysis {
  url: string;
  title: string;
  description: string;
  ogTags: Record<string, string>;
  sections: string[];
  navigation: { text: string; href: string }[];
  externalResources: {
    fonts: string[];
    cssFrameworks: string[];
    jsLibraries: string[];
    iconLibraries: string[];
  };
  colors: string[];
  cssContent: string;
  pages: { url: string; html: string }[];
  formattedContext: string;
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  // Normalize URL
  if (!url.startsWith("http")) url = "https://" + url;

  // Try Playwright first (renders JS, bypasses anti-bot), fall back to fetch
  let mainHtml = await fetchWithPlaywright(url);
  if (!mainHtml) {
    mainHtml = await fetchPage(url);
  }
  if (!mainHtml) throw new Error(`Could not fetch ${url}`);

  // Extract metadata
  const title = extractTag(mainHtml, "title") || url;
  const description =
    extractMeta(mainHtml, "description") ||
    extractMeta(mainHtml, "og:description") ||
    "";
  const ogTags = extractOgTags(mainHtml);

  // Extract navigation links
  const navigation = extractNavLinks(mainHtml, url);

  // Extract external resources
  const externalResources = extractExternalResources(mainHtml);

  // Extract colors from inline styles and style tags
  const colors = extractColors(mainHtml);

  // Fetch CSS stylesheets
  const cssUrls = extractCssUrls(mainHtml, url);
  const cssContents: string[] = [];
  let totalCssLen = 0;
  for (const cssUrl of cssUrls.slice(0, 3)) {
    if (totalCssLen > 10000) break;
    const css = await fetchPage(cssUrl);
    if (css) {
      const chunk = css.slice(0, 8000);
      cssContents.push(`/* ${cssUrl} */\n${chunk}`);
      totalCssLen += chunk.length;
    }
  }
  const cssContent = cssContents.join("\n\n");

  // Extract colors from CSS too
  const cssColors = extractColorsFromCss(cssContent);
  const allColors = [...new Set([...colors, ...cssColors])].slice(0, 30);

  // Identify page sections
  const sections = identifySections(mainHtml);

  // Crawl a few internal pages
  const internalLinks = navigation
    .filter((n) => n.href.startsWith(url) || n.href.startsWith("/"))
    .map((n) =>
      n.href.startsWith("/") ? new URL(n.href, url).toString() : n.href
    )
    .filter((href) => href !== url && href !== url + "/")
    .slice(0, 2);

  const pages: { url: string; html: string }[] = [
    { url, html: truncateHtml(mainHtml) },
  ];

  for (const pageUrl of internalLinks) {
    const html = await fetchPage(pageUrl);
    if (html) {
      pages.push({ url: pageUrl, html: truncateHtml(html) });
    }
  }

  // Build formatted context for LLM
  const formattedContext = buildContext(
    url,
    title,
    description,
    ogTags,
    navigation,
    externalResources,
    allColors,
    sections,
    cssContent,
    pages
  );

  return {
    url,
    title,
    description,
    ogTags,
    sections,
    navigation,
    externalResources,
    colors: allColors,
    cssContent,
    pages,
    formattedContext,
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

    // Block heavy resources to speed up loading
    await page.route("**/*.{png,jpg,jpeg,gif,webp,svg,mp4,webm,woff2,woff}", (route) =>
      route.abort()
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait a bit for JS to render
    await page.waitForTimeout(2000);

    const html = await page.content();
    await browser.close();
    return html;
  } catch (err) {
    // Playwright not available or failed — fall back to fetch
    console.log("Playwright fetch failed, falling back to HTTP fetch:", (err as Error).message);
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,text/css,*/*",
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
    new RegExp(
      `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i"
    )
  );
  if (match) return match[1];
  // Try reversed attribute order
  const match2 = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`,
      "i"
    )
  );
  return match2 ? match2[1] : null;
}

function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const regex =
    /<meta[^>]*property=["'](og:[^"']+)["'][^>]*content=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html))) {
    tags[match[1]] = match[2];
  }
  return tags;
}

function extractNavLinks(
  html: string,
  baseUrl: string
): { text: string; href: string }[] {
  const links: { text: string; href: string }[] = [];
  // Look for links in nav, header elements
  const navMatch = html.match(
    /<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/gi
  );
  const searchArea = navMatch ? navMatch.join(" ") : html.slice(0, 10000);

  const regex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>([^<]*)</gi;
  let match;
  while ((match = regex.exec(searchArea))) {
    const href = match[1].trim();
    const text = match[2].trim();
    if (text && href && !href.startsWith("javascript:") && !href.startsWith("mailto:")) {
      links.push({ text, href });
    }
  }
  return links.slice(0, 30);
}

function extractExternalResources(html: string) {
  const fonts: string[] = [];
  const cssFrameworks: string[] = [];
  const jsLibraries: string[] = [];
  const iconLibraries: string[] = [];

  // Fonts
  const fontMatches = html.match(/fonts\.googleapis\.com[^"'\s]*/gi) || [];
  for (const m of fontMatches) {
    const family = m.match(/family=([^&"']+)/i);
    if (family) fonts.push(decodeURIComponent(family[1]));
  }

  // CSS frameworks
  if (html.includes("tailwind")) cssFrameworks.push("Tailwind CSS");
  if (html.includes("bootstrap")) cssFrameworks.push("Bootstrap");
  if (html.includes("bulma")) cssFrameworks.push("Bulma");
  if (html.includes("materialize")) cssFrameworks.push("Materialize");

  // JS libraries
  if (html.includes("react")) jsLibraries.push("React");
  if (html.includes("vue")) jsLibraries.push("Vue.js");
  if (html.includes("angular")) jsLibraries.push("Angular");
  if (html.includes("jquery")) jsLibraries.push("jQuery");
  if (html.includes("next")) jsLibraries.push("Next.js");
  if (html.includes("nuxt")) jsLibraries.push("Nuxt.js");
  if (html.includes("gatsby")) jsLibraries.push("Gatsby");
  if (html.includes("astro")) jsLibraries.push("Astro");

  // Icons
  if (html.includes("font-awesome") || html.includes("fontawesome"))
    iconLibraries.push("Font Awesome");
  if (html.includes("lucide")) iconLibraries.push("Lucide");
  if (html.includes("heroicons")) iconLibraries.push("Heroicons");
  if (html.includes("material-icons")) iconLibraries.push("Material Icons");

  return { fonts, cssFrameworks, jsLibraries, iconLibraries };
}

function extractColors(html: string): string[] {
  const colors = new Set<string>();
  // Hex colors
  const hexMatches = html.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  for (const c of hexMatches) {
    if (c.length === 4 || c.length === 7 || c.length === 9) colors.add(c.toLowerCase());
  }
  // RGB/RGBA
  const rgbMatches =
    html.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g) || [];
  for (const c of rgbMatches) colors.add(c);
  // CSS variables with color values
  const varMatches = html.match(/--[\w-]+:\s*#[0-9a-fA-F]{3,8}/g) || [];
  for (const v of varMatches) colors.add(v);

  return [...colors].slice(0, 40);
}

function extractColorsFromCss(css: string): string[] {
  return extractColors(css);
}

function extractCssUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const regex = /<link[^>]*href=["']([^"']+\.css[^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html))) {
    let href = match[1];
    if (href.startsWith("//")) href = "https:" + href;
    else if (href.startsWith("/")) href = new URL(href, baseUrl).toString();
    else if (!href.startsWith("http")) href = new URL(href, baseUrl).toString();
    urls.push(href);
  }
  return urls;
}

function identifySections(html: string): string[] {
  const sections: string[] = [];
  // Look for semantic elements and common class names
  const sectionRegex =
    /<(?:section|header|footer|main|aside|article)[^>]*(?:id|class)=["']([^"']+)["']/gi;
  let match;
  while ((match = sectionRegex.exec(html))) {
    sections.push(match[1]);
  }
  // Also look for common section indicators
  const commonSections = [
    "hero", "banner", "features", "pricing", "testimonials",
    "about", "contact", "cta", "footer", "header", "nav",
    "faq", "team", "blog", "gallery", "portfolio",
  ];
  for (const s of commonSections) {
    if (html.toLowerCase().includes(s) && !sections.some((x) => x.includes(s))) {
      sections.push(s);
    }
  }
  return [...new Set(sections)].slice(0, 20);
}

function truncateHtml(html: string): string {
  let cleaned = html
    // Remove all scripts entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Remove inline styles content but keep the tag for structure
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "<!-- styles extracted separately -->")
    // Remove SVG content (often huge)
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "<!-- svg -->")
    // Remove data attributes (often huge base64 or JSON)
    .replace(/\s+data-[a-z-]+="[^"]{100,}"/gi, "")
    // Remove noscript blocks
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    // Collapse whitespace
    .replace(/\s{2,}/g, " ")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "");

  // Hard limit per page
  if (cleaned.length > 15000) {
    cleaned = cleaned.slice(0, 15000) + "\n<!-- truncated -->";
  }
  return cleaned;
}

function buildContext(
  url: string,
  title: string,
  description: string,
  ogTags: Record<string, string>,
  navigation: { text: string; href: string }[],
  resources: WebsiteAnalysis["externalResources"],
  colors: string[],
  sections: string[],
  cssContent: string,
  pages: { url: string; html: string }[]
): string {
  const parts: string[] = [];

  parts.push(`# Website Analysis: ${url}`);
  parts.push(`**Title:** ${title}`);
  parts.push(`**Description:** ${description}`);

  if (Object.keys(ogTags).length > 0) {
    parts.push("\n## OG Tags");
    for (const [k, v] of Object.entries(ogTags)) {
      parts.push(`- ${k}: ${v}`);
    }
  }

  if (navigation.length > 0) {
    parts.push("\n## Navigation Structure");
    for (const link of navigation) {
      parts.push(`- [${link.text}](${link.href})`);
    }
  }

  parts.push("\n## Detected Technologies");
  if (resources.fonts.length) parts.push(`**Fonts:** ${resources.fonts.join(", ")}`);
  if (resources.cssFrameworks.length) parts.push(`**CSS Frameworks:** ${resources.cssFrameworks.join(", ")}`);
  if (resources.jsLibraries.length) parts.push(`**JS Libraries:** ${resources.jsLibraries.join(", ")}`);
  if (resources.iconLibraries.length) parts.push(`**Icons:** ${resources.iconLibraries.join(", ")}`);

  if (colors.length > 0) {
    parts.push(`\n## Colors Found\n${colors.join(", ")}`);
  }

  if (sections.length > 0) {
    parts.push(`\n## Sections Detected\n${sections.join(", ")}`);
  }

  if (cssContent) {
    parts.push("\n## CSS Stylesheets (extracted)");
    parts.push("```css");
    parts.push(cssContent.slice(0, 10000));
    parts.push("```");
  }

  for (const page of pages) {
    parts.push(`\n## Page: ${page.url}`);
    parts.push("```html");
    parts.push(page.html);
    parts.push("```");
  }

  // Hard cap total context at ~60K chars (~15K tokens)
  let result = parts.join("\n");
  if (result.length > 60000) {
    result = result.slice(0, 60000) + "\n\n<!-- context truncated to fit token limits -->";
  }

  return result;
}
