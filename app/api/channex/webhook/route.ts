import { NextRequest, NextResponse } from "next/server";

import { buildWebhookReceipt, sampleBookingRevision } from "@/lib/channex-demo";

export async function GET() {
  return NextResponse.json({
    event: "booking_new",
    sample_payload: sampleBookingRevision,
    expected_receiver: "/api/channex/webhook",
  });
}

export async function POST(request: NextRequest) {
  const revision = await request.json().catch(() => sampleBookingRevision);

  return NextResponse.json(buildWebhookReceipt(revision));
}
