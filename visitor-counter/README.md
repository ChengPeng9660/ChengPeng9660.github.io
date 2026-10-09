# Homepage page-view counter

The footer shows cumulative homepage page loads since 9 October 2026. Reloads count again. It is separate from Cloudflare Web Analytics Visits and Page views, which have their own filtering and reporting delay.

The counter uses a Cloudflare Worker and a SQLite-backed Durable Object compatible with the Workers Free plan. It stores one aggregate number, sets no cookies, uses no browser storage, and stores no visitor identifiers, IP addresses, or user agents. Known automated user agents are excluded from increments.

- `GET /api/views` reads the count without incrementing it.
- `POST /api/views` increments once for a page load from `https://chengpeng9660.github.io`.
- `OPTIONS` never increments the count.

The Origin check restricts ordinary browser writes; this lightweight public counter is not intended to prevent a determined caller from forging requests.

Deploy from this directory after authenticating with Cloudflare:

```sh
npx wrangler@4.92.0 whoami
npx wrangler@4.92.0 deploy
```

Do not delete or rename the Durable Object namespace or the `homepage` object: it holds the accumulated count. Frontend loading failures show a dash instead of a fabricated number.
