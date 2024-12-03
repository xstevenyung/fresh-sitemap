import { SitemapContext } from "../mod.ts";
import {
  assert,
  assertStringIncludes,
  assertThrows,
  FakeTime,
} from "../src/deps.ts";
import { ChangeFrequency, Manifest, Priority } from "../src/types.ts";

const url = "https://deno.land";
Deno.env.set("APP_URL", url);

Deno.test("Empty sitemap", () => {
  const manifest: Manifest = {
    routes: {},
    islands: {},
    baseUrl: url,
  };

  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.generate();

  assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
  assertStringIncludes(
    result,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );
  assertStringIncludes(result, "</urlset>");
});

Deno.test("Map root index.ts", () => {
  const time = new FakeTime(new Date("2022-07-01"));
  const manifest: Manifest = {
    routes: {
      "./routes/index.tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.generate();

  try {
    assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
    assertStringIncludes(
      result,
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );

    assertStringIncludes(result, `<loc>https://deno.land/</loc>`);
    assertStringIncludes(result, `<lastmod>2022-07-01</lastmod>`);
    assertStringIncludes(result, `<changefreq>daily</changefreq>`);
    assertStringIncludes(result, `<priority>0.8</priority>`);

    assertStringIncludes(result, "</urlset>");
  } finally {
    time.restore();
  }
});

Deno.test("Map static route file", () => {
  const time = new FakeTime(new Date("2022-07-01"));
  const sitemap = new SitemapContext(url, {
    routes: {
      "./routes/dashboard.tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  });

  const result = sitemap.generate();

  try {
    assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
    assertStringIncludes(
      result,
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );

    assertStringIncludes(result, `<loc>https://deno.land/dashboard</loc>`);
    assertStringIncludes(result, `<lastmod>2022-07-01</lastmod>`);
    assertStringIncludes(result, `<changefreq>daily</changefreq>`);
    assertStringIncludes(result, `<priority>0.8</priority>`);

    assertStringIncludes(result, "</urlset>");
  } finally {
    time.restore();
  }
});

Deno.test("Ignore special routes file starting with _", () => {
  const manifest: Manifest = {
    routes: {
      "./routes/_middleware.tsx": { default: () => null },
      "./routes/blog/_middleware.tsx": { default: () => null },
      "./routes/_404.tsx": { default: () => null },
      "./routes/_500.tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.generate();

  assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
  assertStringIncludes(
    result,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );

  assert(!result.includes(`<loc>https://deno.land/_404</loc>`));
  assert(!result.includes(`<loc>https://deno.land/_middleware</loc>`));
  assert(!result.includes(`<loc>https://deno.land/blog/_middleware</loc>`));
  assert(!result.includes(`<loc>https://deno.land/_500</loc>`));

  assertStringIncludes(result, "</urlset>");
});

Deno.test("Ignore dynamic routes if no sitemap function given", () => {
  const manifest: Manifest = {
    routes: {
      "./routes/blog/[slug].tsx": {
        default: () => null,
      },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.generate();

  assert(!result.includes(`<loc>https://deno.land/blog/[slug]</loc>`));
});

Deno.test("Ignore sitemap.xml route", () => {
  const manifest: Manifest = {
    routes: {
      "./routes/sitemap.xml.ts": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.generate();

  assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
  assertStringIncludes(
    result,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );

  assert(!result.includes(`<loc>https://deno.land/sitemap.xml</loc>`));

  assertStringIncludes(result, "</urlset>");
});

Deno.test("Add additional routes", () => {
  const manifest: Manifest = {
    routes: {
      "./routes/blog/[slug].tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);
  const lastmod = new Date("2022-10-02");
  const changefreq: ChangeFrequency = "monthly";
  const priority: Priority = "0.7";
  const result = sitemap
    .add("/blog/hello-world")
    .add("help", { lastmod, changefreq, priority })
    .generate();

  assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
  assertStringIncludes(
    result,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );

  assertStringIncludes(result, "<loc>https://deno.land/blog/hello-world</loc>");
  assertStringIncludes(result, "<loc>https://deno.land/help</loc>");
  assertStringIncludes(result, "<lastmod>2022-10-02</lastmod>");
  assertStringIncludes(result, "<changefreq>daily</changefreq>");
  assertStringIncludes(result, "<priority>0.7</priority>");

  assertStringIncludes(result, "</urlset>");
});

Deno.test("Remove certain routes", () => {
  const manifest: Manifest = {
    routes: {
      "./routes/blog/[slug].tsx": { default: () => null },
      "./routes/gfm.css.tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.remove("/gfm.css").generate();

  assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
  assertStringIncludes(
    result,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );

  assertThrows(() =>
    assertStringIncludes(result, "<loc>https://deno.land/gfm.css</loc>")
  );

  assertStringIncludes(result, "</urlset>");
});

Deno.test("Remove all routes from /api", () => {
  const manifest: Manifest = {
    routes: {
      "./routes/blog/[slug].tsx": { default: () => null },
      "./routes/api/[...rest].tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  const result = sitemap.remove("/api/*").generate();

  assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
  assertStringIncludes(
    result,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );

  assertThrows(() =>
    assertStringIncludes(result, "<loc>https://deno.land/api</loc>")
  );

  assertStringIncludes(result, "</urlset>");
});

Deno.test("Set current route", async (t) => {
  const manifest: Manifest = {
    routes: {
      "./routes/blog/[slug].tsx": { default: () => null },
    },
    islands: {},
    baseUrl: url,
  };
  const sitemap = new SitemapContext(url, manifest);

  await t.step("add route", () => {
    const lastmod = new Date("2022-10-02");
    const changefreq: ChangeFrequency = "daily";
    const priority: Priority = "0.7";
    const result = sitemap
      .add("help", { lastmod, changefreq, priority })
      .generate();
    assertStringIncludes(result, '<?xml version="1.0" encoding="UTF-8"?>');
    assertStringIncludes(
      result,
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );

    assertStringIncludes(result, "<loc>https://deno.land/help</loc>");
    assertStringIncludes(result, "<lastmod>2022-10-02</lastmod>");
    assertStringIncludes(result, "<changefreq>daily</changefreq>");
    assertStringIncludes(result, "<priority>0.7</priority>");
    assertStringIncludes(result, "</urlset>");
  });
  await t.step("set route all parameter", () => {
    const newLastmod = new Date("2022-10-01");
    const newChangefreq: ChangeFrequency = "monthly";
    const newPriority: Priority = "0.9";
    const result = sitemap
      .set("help", {
        lastmod: newLastmod,
        changefreq: newChangefreq,
        priority: newPriority,
      })
      .generate();
    assertStringIncludes(result, "<loc>https://deno.land/help</loc>");
    assertStringIncludes(result, "<lastmod>2022-10-01</lastmod>");
    assertStringIncludes(result, "<changefreq>monthly</changefreq>");
    assertStringIncludes(result, "<priority>0.9</priority>");
    assertStringIncludes(result, "</urlset>");
  });
  await t.step("set route single parameter", () => {
    const newPriority: Priority = "0.4";
    const result = sitemap.set("help", { priority: newPriority }).generate();
    assertStringIncludes(result, "<loc>https://deno.land/help</loc>");
    assertStringIncludes(result, "<lastmod>2022-10-01</lastmod>");
    assertStringIncludes(result, "<changefreq>monthly</changefreq>");
    assertStringIncludes(result, "<priority>0.4</priority>");
    assertStringIncludes(result, "</urlset>");
  });
});
