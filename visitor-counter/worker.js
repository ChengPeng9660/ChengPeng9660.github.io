import { DurableObject } from "cloudflare:workers";

const HOMEPAGE_ORIGIN = "https://chengpeng9660.github.io";
const STARTED_ON = "2026-10-09";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": HOMEPAGE_ORIGIN,
      "Cache-Control": "no-store",
      "Vary": "Origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export class HomepageViews extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS views (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL DEFAULT 0)"
    );
    ctx.storage.sql.exec("INSERT OR IGNORE INTO views (id, total) VALUES (1, 0)");
  }

  read() {
    return this.ctx.storage.sql.exec("SELECT total FROM views WHERE id = 1").one().total;
  }

  increment() {
    return this.ctx.storage.sql.exec(
      "UPDATE views SET total = total + 1 WHERE id = 1 RETURNING total"
    ).one().total;
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/views") {
      return json({ error: "not_found" }, 404);
    }

    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (origin !== HOMEPAGE_ORIGIN) return json({ error: "forbidden" }, 403);
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": HOMEPAGE_ORIGIN,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return json({ error: "method_not_allowed" }, 405);
    }
    if (request.method === "POST" && origin !== HOMEPAGE_ORIGIN) {
      return json({ error: "forbidden" }, 403);
    }

    try {
      const counter = env.HOMEPAGE_VIEWS.get(env.HOMEPAGE_VIEWS.idFromName("homepage"));
      const automated = request.cf?.botManagement?.verifiedBot ||
        /bot|crawl|spider|headlesschrome|lighthouse|preview/i.test(request.headers.get("User-Agent") || "");
      const views = request.method === "POST" && !automated
        ? await counter.increment()
        : await counter.read();
      return json({ views, startedOn: STARTED_ON });
    } catch {
      return json({ error: "counter_unavailable" }, 503);
    }
  },
};
