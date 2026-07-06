import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "694458218270-hom88eevqf7i881sgclhbu93o3de786c.apps.googleusercontent.com";

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function createLocalGoogleToken(payload: Record<string, unknown>) {
  return `google-local.${base64UrlEncode(JSON.stringify(payload))}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { credential?: string } | null;
  const credential = body?.credential;

  if (!credential) {
    return NextResponse.json({ detail: "Credential Google wajib dikirim." }, { status: 422 });
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    { cache: "no-store" }
  );
  const tokenInfo = (await tokenInfoResponse.json().catch(() => ({}))) as GoogleTokenInfo & {
    error_description?: string;
  };

  if (!tokenInfoResponse.ok) {
    return NextResponse.json(
      { detail: tokenInfo.error_description || "Credential Google tidak valid." },
      { status: 401 }
    );
  }

  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    return NextResponse.json({ detail: "Audience Google Client ID tidak sesuai." }, { status: 401 });
  }

  if (String(tokenInfo.email_verified) !== "true") {
    return NextResponse.json({ detail: "Email Google belum terverifikasi." }, { status: 401 });
  }

  const user = {
    id: `google:${tokenInfo.sub}`,
    nama: tokenInfo.name || tokenInfo.email || "Pengguna Google",
    email: tokenInfo.email,
    role: "user",
    picture: tokenInfo.picture,
    provider: "google",
  };

  return NextResponse.json({
    access_token: createLocalGoogleToken({
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name,
      picture: tokenInfo.picture,
      provider: "google",
      issued_at: new Date().toISOString(),
    }),
    token_type: "bearer",
    user,
  });
}
