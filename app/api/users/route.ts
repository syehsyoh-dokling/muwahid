import { NextResponse } from "next/server";

const upstreamBase = process.env.UNIVERSAL_API_BASE?.replace(/\/$/, "") || "https://unapi.danandad.org/api";

type RegisterPayload = {
  city_id?: string;
  device_location?: string;
  desa_id?: string;
  dis_id?: string;
  email?: string;
  ip_address?: string;
  name?: string;
  password?: string;
  phone?: string;
  prov_id?: string;
  referral_code?: string;
  role?: string;
  user_agent?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterPayload | null;

  if (!body) {
    return NextResponse.json({ detail: "Payload pendaftaran tidak valid." }, { status: 422 });
  }

  const upstreamResponse = await fetch(`${upstreamBase}/auth/register?include=full`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "MUWAHID-Web/1.0",
    },
    body: JSON.stringify({
      email: body.email,
      full_name: body.name,
      phone: body.phone,
      password: body.password,
      province_id: body.prov_id,
      regency_id: body.city_id,
      district_id: body.dis_id,
      village_id: body.desa_id,
      referral_code: body.referral_code,
      ip_address: body.ip_address,
      device_location: body.device_location,
      role: body.role || "user",
      user_agent: body.user_agent,
    }),
  });

  const payload = await upstreamResponse.json().catch(() => ({}));

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        detail: payload.message || payload.detail || "Gagal membuat akun.",
        upstream_status: upstreamResponse.status,
      },
      { status: upstreamResponse.status }
    );
  }

  return NextResponse.json(
    {
      message: payload.message || "Akun berhasil dibuat.",
      user: payload.data?.user,
      auth: payload.data?.auth,
    },
    { status: 201 }
  );
}
