import { NextResponse } from "next/server";

const upstreamBase = process.env.UNIVERSAL_API_BASE?.replace(/\/$/, "") || "https://unapi.danandad.org/api";

type ProfilePayload = {
  city_id?: string;
  desa_id?: string;
  dis_id?: string;
  email?: string;
  name?: string;
  phone?: string;
  prov_id?: string;
};

function authHeaders(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "MUWAHID-Web/1.0",
    ...(authorization ? { Authorization: authorization } : {}),
  };
}

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" ? (value as ApiRecord) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function createGoogleLocalToken(payload: ApiRecord) {
  return `google-local.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

function getGoogleLocalPayload(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");

  if (!token.startsWith("google-local.")) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(token.slice("google-local.".length), "base64url").toString("utf8")) as ApiRecord;
  } catch {
    return null;
  }
}

function getGoogleLocalUser(request: Request) {
  const payload = getGoogleLocalPayload(request);
  if (!payload) return null;

  const email = stringValue(payload.email);
  const sub = stringValue(payload.sub);

  if (!email || !sub) {
    return null;
  }

  return {
    id: `google:${sub}`,
    nama: stringValue(payload.name) || email,
    email,
    role: "user",
    picture: stringValue(payload.picture),
    provider: "google",
    wa: stringValue(payload.phone),
    prov_id: stringValue(payload.prov_id) || null,
    city_id: stringValue(payload.city_id) || null,
    dis_id: stringValue(payload.dis_id) || null,
    desa_id: stringValue(payload.desa_id) || null,
    region: null,
  };
}

function normalizeUser(payload: ApiRecord) {
  const data = asRecord(payload.data);
  const user = asRecord(data.user || payload.user || data || payload);

  return {
    ...user,
    nama: stringValue(user.nama || user.name || user.full_name),
    wa: stringValue(user.wa || user.phone),
    prov_id: stringValue(user.prov_id || user.province_id) || null,
    city_id: stringValue(user.city_id || user.regency_id) || null,
    dis_id: stringValue(user.dis_id || user.district_id) || null,
    desa_id: stringValue(user.desa_id || user.village_id) || null,
  };
}

export async function GET(request: Request) {
  const googleLocalUser = getGoogleLocalUser(request);
  if (googleLocalUser) {
    return NextResponse.json({ user: googleLocalUser });
  }

  const upstreamResponse = await fetch(`${upstreamBase}/auth/me`, {
    method: "GET",
    cache: "no-store",
    headers: authHeaders(request),
  });

  const payload = await upstreamResponse.json().catch(() => ({}));

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        detail: payload.message || payload.detail || "Gagal memuat profil.",
        upstream_status: upstreamResponse.status,
      },
      { status: upstreamResponse.status }
    );
  }

  return NextResponse.json({ user: normalizeUser(payload) });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as ProfilePayload | null;

  if (!body) {
    return NextResponse.json({ detail: "Payload profil tidak valid." }, { status: 422 });
  }

  const googleLocalPayload = getGoogleLocalPayload(request);
  if (googleLocalPayload) {
    const nextPayload: ApiRecord = {
      ...googleLocalPayload,
      email: body.email || googleLocalPayload.email,
      name: body.name || googleLocalPayload.name,
      phone: body.phone || googleLocalPayload.phone,
      prov_id: body.prov_id || googleLocalPayload.prov_id,
      city_id: body.city_id || googleLocalPayload.city_id,
      dis_id: body.dis_id || googleLocalPayload.dis_id,
      desa_id: body.desa_id || googleLocalPayload.desa_id,
      profile_completed_at: new Date().toISOString(),
    };

    return NextResponse.json({
      message: "Profil berhasil diperbarui.",
      access_token: createGoogleLocalToken(nextPayload),
      user: {
        id: `google:${stringValue(nextPayload.sub)}`,
        nama: stringValue(nextPayload.name) || stringValue(nextPayload.email),
        email: stringValue(nextPayload.email),
        role: "user",
        picture: stringValue(nextPayload.picture),
        provider: "google",
        wa: stringValue(nextPayload.phone),
        prov_id: stringValue(nextPayload.prov_id) || null,
        city_id: stringValue(nextPayload.city_id) || null,
        dis_id: stringValue(nextPayload.dis_id) || null,
        desa_id: stringValue(nextPayload.desa_id) || null,
        region: null,
      },
    });
  }

  const upstreamResponse = await fetch(`${upstreamBase}/auth/me`, {
    method: "PATCH",
    cache: "no-store",
    headers: authHeaders(request),
    body: JSON.stringify({
      email: body.email,
      full_name: body.name,
      phone: body.phone,
      province_id: body.prov_id,
      regency_id: body.city_id,
      district_id: body.dis_id,
      village_id: body.desa_id,
    }),
  });

  const payload = await upstreamResponse.json().catch(() => ({}));

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        detail: payload.message || payload.detail || "Gagal memperbarui profil.",
        upstream_status: upstreamResponse.status,
      },
      { status: upstreamResponse.status }
    );
  }

  return NextResponse.json({ message: payload.message || "Profil berhasil diperbarui.", user: normalizeUser(payload) });
}
