# Fresh SEO 🍋   [![Badge License]][License]

*Quickly creating sitemaps for your **Deno [Fresh project]**.*

<br>

## Getting Started

*Import the plugin `freshSEOPlugin` in your Fresh app*

```ts
// ./main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { freshSEOPlugin } from "https://deno.land/x/fresh_seo/mod.ts";

await start(manifest, {
  plugins: [
    freshSEOPlugin(manifest)
  ],
});

```

A basic sitemap should now be available at:
    
[`http://localhost:8000/sitemap.xml`][Localhost]
    
<br>

## How does it work?

**Fresh SEO 🍋** automatically maps out **static** routes in your project.

*For basic routes, you do not have to do anything manually.*

<br>

### Dynamic Routes

*You will still have to map dynamic routes yourself!*

```ts
// ./main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { freshSEOPlugin } from "https://deno.land/x/fresh_seo/mod.ts";

await start(manifest, {
  plugins: [
    freshSEOPlugin(manifest, {
        include: ["/blog/intro"]
    })
  ],
});
```

*You can also remove unwanted routes*

```ts
// ./main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { freshSEOPlugin } from "https://deno.land/x/fresh_seo/mod.ts";

await start(manifest, {
  plugins: [
    freshSEOPlugin(manifest, {
        exclude: [
            "/blog/intro",
            "/api/*"
        ]
    })
  ],
});
```

*If needed, sitemap.xml can be generated as a static file in Fresh `staticDir`*

```ts
// ./main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { freshSEOPlugin } from "https://deno.land/x/fresh_seo/mod.ts";

await start(manifest, {
  plugins: [
    freshSEOPlugin(manifest, {
        static: true
    })
  ],
});
```

While `static:true`, sitemap.xml also generates during Fresh `deno task build`.
Note that `deno task build` does not know anything about routing, so you will need to provide `staticPrefix` to avoid relative paths generation:

```ts
// ./main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { freshSEOPlugin } from "https://deno.land/x/fresh_seo/mod.ts";

await start(manifest, {
  plugins: [
    freshSEOPlugin(manifest, {
        static: true,
        staticPrefix: "https://yourhost.com"
    })
  ],
});
```

<br>

## Testing

The test suite can be started with

```shell
deno task test
```

<br>

<!----------------------------------------------------------------------------->

[Fresh project]: https://fresh.deno.dev/
[Localhost]: http://localhost:8000/sitemap.xml

[License]: LICENSE


<!----------------------------------[ Badges ]--------------------------------->

[Badge License]: https://img.shields.io/badge/License-MIT-ac8b11.svg?style=for-the-badge&labelColor=yellow
