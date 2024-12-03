/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import { basename, extname, filterFiles, Manifest } from "./deps.ts";
import { type Route, type RouteProps } from "./types.ts";

export class SitemapContext {
  #url: string;
  #manifest: Manifest;
  #globalIgnore = ["sitemap.xml"];
  #routes: Array<Route> = [];

  constructor(url: string, manifest: Manifest) {
    this.#url = url;
    this.#manifest = manifest;
    this.#routes = Object.entries(this.#manifest.routes)
      .filter(([path]) => {
        const file = basename(path);
        const fileName = file.replace(extname(file), "");
        const isDynamic = !!path.match(/\[.+\]/)?.length;

        if (
          isDynamic ||
          fileName.startsWith("_") ||
          this.#globalIgnore.includes(fileName)
        ) {
          return false;
        }

        return true;
      })
      .map(([path]) => {
        return {
          pathName: path
            .replace(extname(path), "")
            .replace("./routes", "")
            .replace("index", ""), // We remove index as it's consider a "/" in Fresh
        };
      });
  }

  get routes() {
    return this.#routes;
  }

  add(route: string, props?: RouteProps) {
    if (typeof props === "undefined") {
      this.#routes.push({
        pathName: route.replace(/(^\/?)|(\/?$)/, "/"),
      });
      return this;
    }

    const { changefreq, priority, lastmod } = props;

    this.#routes.push({
      pathName: route.replace(/(^\/?)|(\/?$)/, "/"),
      changefreq,
      priority,
      lastmod,
    });

    return this;
  }

  set(route: string, props?: RouteProps) {
    if (typeof props === "undefined") return this;

    const i = this.#routes.findIndex(
      (v) => v.pathName === route.replace(/(^\/?)|(\/?$)/, "/"),
    );

    if (i === -1) return this;

    const { changefreq, priority, lastmod } = props;
    const currentRoute = this.#routes[i];
    this.#routes[i] = {
      ...currentRoute,
      changefreq: changefreq ?? currentRoute.changefreq,
      priority: priority ?? currentRoute.priority,
      lastmod: lastmod ?? currentRoute.lastmod,
    };
    return this;
  }

  remove(route: string) {
    // glob_filter works best with absolute paths
    // so we need to add the url to the route
    const matching = filterFiles(
      this.#routes.map((r) => this.#url + r.pathName),
      { match: this.#url + route, ignore: this.#globalIgnore },
    );
    this.#routes = this.#routes.filter((r) =>
      !matching.map((m) => m.replace(this.#url, "")).includes(r.pathName)
    );

    return this;
  }

  generate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
      ${
      this.routes
        .map((route) => {
          return `<url>
          <loc>${this.#url}${route.pathName}</loc>
          <lastmod>${formatYearMonthDate(route.lastmod ?? new Date())}</lastmod>
          <changefreq>${route.changefreq ?? "daily"}</changefreq>
          <priority>${route.priority ?? "0.8"}</priority>
        </url>`;
        })
        .join("\n")
    }
    </urlset>`;
  }

  render() {
    return new Response(this.generate(), {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // async save() {
  //   const outPath = join(this.#staticDir, "sitemap.xml");

  //   try {
  //     const content = this.generate();

  //     await ensureFile(outPath);

  //     return Deno.writeTextFile(outPath, content);
  //   } catch (e) {
  //     console.warn(e.message);
  //     return null;
  //   }
  // }
}

function formatYearMonthDate(date: Date) {
  return `${date.getFullYear()}-${("00" + (date.getMonth() + 1)).slice(-2)}-${
    ("00" + date.getDate()).slice(-2)
  }`;
}
