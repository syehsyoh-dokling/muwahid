import { NextResponse } from "next/server";

const upstreamBase = process.env.UNIVERSAL_API_BASE?.replace(/\/$/, "") || "https://unapi.danandad.org/api";

type LoginPayload = {
  device_location?: string;
  email?: string;
  ip_address?: string;
  page_code?: string;
  password?: string;
  referral_code?: string;
  user_agent?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginPayload | null;

  if (!body) {
    return NextResponse.json({ detail: "Payload login tidak valid." }, { status: 422 });
  }

  const upstreamResponse = await fetch(`${upstreamBase}/auth/login?include=full`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "MUWAHID-Web/1.0",
    },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      referral_code: body.referral_code,
      ip_address: body.ip_address,
      device_location: body.device_location,
      user_agent: body.user_agent,
      page_code: body.page_code,
    }),
  });

  const payload = await upstreamResponse.json().catch(() => ({}));

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        detail: payload.message || payload.detail || "Login gagal.",
        upstream_status: upstreamResponse.status,
      },
      { status: upstreamResponse.status }
    );
  }

  const auth = payload.data?.auth || {};

  return NextResponse.json({
    access_token: auth.access_token || auth.accessToken || "",
    refresh_token: auth.refresh_token || auth.refreshToken || "",
    token_type: auth.token_type || auth.tokenType || "bearer",
    user: payload.data?.user,
  });
}
