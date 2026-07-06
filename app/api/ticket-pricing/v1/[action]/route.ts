import { NextResponse } from "next/server";

const upstreamBase = process.env.UNIVERSAL_API_BASE?.replace(/\/$/, "") || "https://unapi.danandad.org/api";

type StopBucket = "direct" | "onestop" | "twostop";

type TicketRecord = {
  origin: string;
  destination: string;
  tgl_berangkat: string;
  price_idr: number;
  airline_summary: string;
  segments: Array<{
    dep_airport: string;
    arr_airport: string;
    dep_time: string;
    arr_time: string;
    airline_iata: string;
    flight_number: string;
  }>;
};

const outboundDestinations = ["JED", "MED"];
const airlineByBucket: Record<StopBucket, string[]> = {
  direct: ["GA", "SV"],
  onestop: ["QR", "EK"],
  twostop: ["EY", "WY"],
};

function dateFromMonth(month: string, offset: number) {
  const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const date = new Date(`${safeMonth}-08T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function buildSegments(origin: string, destination: string, bucket: StopBucket, airline: string, index: number) {
  if (bucket === "direct") {
    return [
      {
        dep_airport: origin,
        arr_airport: destination,
        dep_time: `${String(8 + index).padStart(2, "0")}:20`,
        arr_time: `${String(15 + index).padStart(2, "0")}:10`,
        airline_iata: airline,
        flight_number: `${760 + index}`,
      },
    ];
  }

  const stops = bucket === "onestop" ? ["DOH"] : ["KUL", "AUH"];
  const points = [origin, ...stops, destination];
  return points.slice(0, -1).map((point, segmentIndex) => ({
    dep_airport: point,
    arr_airport: points[segmentIndex + 1],
    dep_time: `${String(7 + index + segmentIndex * 3).padStart(2, "0")}:30`,
    arr_time: `${String(10 + index + segmentIndex * 3).padStart(2, "0")}:05`,
    airline_iata: airline,
    flight_number: `${410 + index + segmentIndex}`,
  }));
}

function ticket(origin: string, destination: string, date: string, bucket: StopBucket, index: number): TicketRecord {
  const airline = airlineByBucket[bucket][index % airlineByBucket[bucket].length];
  const base = destination === "MED" ? 8_850_000 : 8_450_000;
  const bucketExtra = bucket === "direct" ? 1_700_000 : bucket === "onestop" ? 650_000 : 0;
  const routeExtra = origin === "CGK" ? 0 : 450_000;
  return {
    origin,
    destination,
    tgl_berangkat: date,
    price_idr: base + bucketExtra + routeExtra + index * 320_000,
    airline_summary: airline,
    segments: buildSegments(origin, destination, bucket, airline, index),
  };
}

function bucketsFor(origin: string, destination: string, month: string) {
  return {
    direct: [0, 18].map((offset, index) => ticket(origin, destination, dateFromMonth(month, offset), "direct", index)),
    one_stop: [4, 12, 24].map((offset, index) => ticket(origin, destination, dateFromMonth(month, offset), "onestop", index)),
    two_stop: [2, 16, 28].map((offset, index) => ticket(origin, destination, dateFromMonth(month, offset), "twostop", index)),
  };
}

function cheapestResponse(origin: string, month: string) {
  const outbound = { direct: [] as TicketRecord[], one_stop: [] as TicketRecord[], two_stop: [] as TicketRecord[] };
  const inbound = { direct: [] as TicketRecord[], one_stop: [] as TicketRecord[], two_stop: [] as TicketRecord[] };

  outboundDestinations.forEach((destination) => {
    const out = bucketsFor(origin, destination, month);
    outbound.direct.push(...out.direct);
    outbound.one_stop.push(...out.one_stop);
    outbound.two_stop.push(...out.two_stop);

    const back = bucketsFor(destination, origin, month);
    inbound.direct.push(...back.direct);
    inbound.one_stop.push(...back.one_stop);
    inbound.two_stop.push(...back.two_stop);
  });

  return { ok: true, source: "muwahid-demo-cache", outbound, inbound };
}

function byDateResponse(origin: string, destination: string, date: string) {
  return {
    ok: true,
    source: "muwahid-demo-cache",
    direct: [ticket(origin, destination, date, "direct", 0), ticket(origin, destination, date, "direct", 1)],
    onestop: [ticket(origin, destination, date, "onestop", 0), ticket(origin, destination, date, "onestop", 1)],
    twostop: [ticket(origin, destination, date, "twostop", 0), ticket(origin, destination, date, "twostop", 1)],
  };
}

async function tryUpstream(action: string, request: Request) {
  const url = new URL(request.url);
  const upstreamUrl = `${upstreamBase}/ticket-pricing/v1/${action}${url.search}`;

  const response = await fetch(upstreamUrl, {
    method: request.method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "MUWAHID-Web/1.0",
    },
    body: request.method === "POST" ? await request.text() : undefined,
  }).catch(() => null);

  if (!response || !response.ok) return null;
  return response.json().catch(() => null);
}

export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const upstream = await tryUpstream(action, request);
  if (upstream) return NextResponse.json(upstream);

  const url = new URL(request.url);
  const origin = (url.searchParams.get("origin") || "CGK").toUpperCase();
  const destination = (url.searchParams.get("destination") || "JED").toUpperCase();
  const month = url.searchParams.get("ym") || new Date().toISOString().slice(0, 7);
  const date = url.searchParams.get("date") || dateFromMonth(month, 0);

  if (action === "cheapest") return NextResponse.json(cheapestResponse(origin, month));
  if (action === "by-date") return NextResponse.json(byDateResponse(origin, destination, date));
  if (action === "recommendation") {
    return NextResponse.json({
      ok: true,
      summary: `Untuk rute ${origin}-${destination}, opsi 1x transit biasanya paling seimbang antara harga dan durasi. Data ini memakai cache demo MUWAHID sampai provider tiket production aktif.`,
    });
  }

  return NextResponse.json({ detail: "Endpoint tiket tidak dikenal." }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const upstream = await tryUpstream(action, request);
  if (upstream) return NextResponse.json(upstream);

  if (action === "activity") {
    return NextResponse.json({ ok: true, source: "muwahid-local-activity" });
  }

  return NextResponse.json({ detail: "Endpoint tiket tidak dikenal." }, { status: 404 });
}
