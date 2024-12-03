import { SitemapContext } from "./sitemap.ts";
import { Manifest, Plugin, RouteProps } from "./types.ts";

interface PluginOptions {
  include?: Array<string | { path: string; options: RouteProps }>;
  exclude?: Array<string>;
}

export const freshSEOPlugin = (
  manifest: Manifest,
  opts: PluginOptions = {},
): Plugin => {
  return {
    name: "fresh-seo",
    routes: [
      {
        path: "/sitemap.xml",
        handler: (req) => {
          const sitemap = new SitemapContext(
            req.url.replace("/sitemap.xml", ""),
            manifest,
          );

          if (opts.include) {
            opts.include.forEach((route) => {
              if (typeof route === "string") {
                sitemap.add(route);
                return;
              }

              sitemap.add(route.path, route.options);
            });
          }

          if (opts.exclude) {
            opts.exclude.forEach((path) => {
              sitemap.remove(path);
            });
          }

          return sitemap.render();
        },
      },
    ],
  };
};
