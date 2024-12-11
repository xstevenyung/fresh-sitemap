import { SitemapContext } from "./sitemap.ts";
import { RouteProps } from "./types.ts";
import { Manifest, Plugin, ResolvedFreshConfig } from "./deps.ts";

interface PluginOptions {
  include?: Array<string | { path: string; options: RouteProps }>;
  exclude?: Array<string>;
  static?: boolean;
  staticPrefix?: string;
}

export const freshSEOPlugin = (
  manifest: Manifest,
  opts: PluginOptions = {},
): Plugin => {
  const resolvePluginOptions = (
    sitemap: SitemapContext,
    opts: PluginOptions,
    config: ResolvedFreshConfig,
  ): SitemapContext => {
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

    if (opts.static === true) {
      sitemap.save(config.staticDir);
    }

    return sitemap;
  };

  return {
    name: "fresh-seo",
    routes: [
      {
        path: "/sitemap.xml",
        handler: (req, ctx) => {
          const sitemap = new SitemapContext(
            req.url.replace("/sitemap.xml", ""),
            manifest,
          );
          return resolvePluginOptions(sitemap, opts, ctx.config).render();
        },
      },
    ],
    async buildStart(config) {
      if (opts.static === true) {
        const sitemap = new SitemapContext(opts.staticPrefix ?? "", manifest);
        resolvePluginOptions(sitemap, opts, config);
        await sitemap.save(config.staticDir).then(() => {
          console.log(
            "Sitemap.xml has been generated to static dir.",
          );
        });
      }
    },
  };
};
