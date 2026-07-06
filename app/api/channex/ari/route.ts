import { NextResponse } from "next/server";

import { ariRows, buildChannexAriPayload } from "@/lib/channex-demo";

type ChannexCallResult = {
  endpoint: string;
  mode: "mock" | "live";
  ok: boolean;
  status: number;
  response: unknown;
};

async function postToChannex(endpoint: string, body: unknown): Promise<ChannexCallResult> {
  const baseUrl = process.env.CHANNEX_BASE_URL || "https://staging.channex.io";
  const apiKey = process.env.CHANNEX_API_KEY;

  if (!apiKey) {
    return {
      endpoint,
      mode: "mock",
      ok: true,
      status: 200,
      response: {
        data: [{ id: `task_${Date.now()}`, type: "task" }],
        meta: {
          message: "Mock success. Set CHANNEX_API_KEY to send this payload to Channex staging.",
          warnings: [],
        },
      },
    };
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({ message: "No JSON response" }));

  return {
    endpoint,
    mode: "live",
    ok: response.ok,
    status: response.status,
    response: payload,
  };
}

export async function GET() {
  const payload = buildChannexAriPayload(ariRows);

  return NextResponse.json({
    property_id: "716305c4-561a-4561-a187-7f5b8aeb5920",
    ...payload,
  });
}

export async function POST() {
  const payload = buildChannexAriPayload(ariRows);
  const [availability, restrictions] = await Promise.all([
    postToChannex(payload.availability.endpoint, payload.availability.body),
    postToChannex(payload.restrictions.endpoint, payload.restrictions.body),
  ]);

  return NextResponse.json({
    synced_at: new Date().toISOString(),
    results: [availability, restrictions],
    payload,
  });
}
