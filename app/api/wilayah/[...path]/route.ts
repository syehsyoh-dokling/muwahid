import { NextResponse } from "next/server";

const upstreamBase =
  process.env.WILAYAH_UPSTREAM_BASE?.replace(/\/$/, "") || "https://unapi.danandad.org/api/indonesia";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const safePath = path.map((part) => encodeURIComponent(part)).join("/");
  const upstreamUrl = `${upstreamBase}/${safePath}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "MUWAHID-Web/1.0",
    },
  });

  const payload = await upstreamResponse.text();
  const contentType = upstreamResponse.headers.get("content-type") || "application/json";

  return new NextResponse(payload, {
    status: upstreamResponse.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}
