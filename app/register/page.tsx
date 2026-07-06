"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/site/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getDistricts, getProvinces, getRegencies, getVillages } from "@/lib/wilayah-api";

type WilayahItem = {
  id: string;
  name: string;
};

type GeoResult = {
  ip: string;
  location: string;
  country: string;
};

function getCachedGeo(): GeoResult {
  const ipMetaRaw = localStorage.getItem("ip_meta");
  if (!ipMetaRaw) {
    return { ip: "", location: "", country: "" };
  }

  try {
    const d = JSON.parse(ipMetaRaw);
    return {
      ip: d.ip || "",
      location: [d.city, d.region].filter(Boolean).join(", "),
      country: d.country || "",
    };
  } catch {
    return { ip: "", location: "", country: "" };
  }
}

function normalize(code?: string | null) {
  const c = String(code ?? "").trim();
  return c ? c.slice(0, 50) : "0000";
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [provinsi, setProvinsi] = useState<WilayahItem[]>([]);
  const [kabupaten, setKabupaten] = useState<WilayahItem[]>([]);
  const [kecamatan, setKecamatan] = useState<WilayahItem[]>([]);
  const [desa, setDesa] = useState<WilayahItem[]>([]);
  const [provinsiId, setProvinsiId] = useState("");
  const [kabupatenId, setKabupatenId] = useState("");
  const [kecamatanId, setKecamatanId] = useState("");
  const [desaId, setDesaId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [isProfileCompletion, setIsProfileCompletion] = useState(false);
  const passwordRequired = !isProfileCompletion;

  useEffect(() => {
    const url = new URL(window.location.href);
    const pathnameMatch = window.location.pathname.match(/referal(\w+)/i);
    const ref = normalize(
      url.searchParams.get("ref") ||
        url.searchParams.get("reff") ||
        pathnameMatch?.[1] ||
        localStorage.getItem("referral")
    );

    localStorage.setItem("referral", ref);

    void getProvinces()
      .then(setProvinsi)
      .catch(() => setError("Gagal memuat data wilayah dari server."));

    const mode = new URL(window.location.href).searchParams.get("mode");
    if (mode === "complete-profile" && localStorage.getItem("access_token")) {
      setIsProfileCompletion(true);
      void fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      })
        .then((res) => res.json())
        .then((payload) => {
          const user = payload.user || {};
          setFullName(user.nama || "");
          setEmail(user.email || "");
          setPhone(user.wa || "");
          setProvinsiId(user.prov_id || "");
          setKabupatenId(user.city_id || "");
          setKecamatanId(user.dis_id || "");
          setDesaId(user.desa_id || "");
          if (user.prov_id) {
            void getRegencies(user.prov_id).then(setKabupaten);
          }
          if (user.city_id) {
            void getDistricts(user.city_id).then(setKecamatan);
          }
          if (user.dis_id) {
            void getVillages(user.dis_id).then(setDesa);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const onChangeProvinsi = async (id: string) => {
    setProvinsiId(id);
    setKabupatenId("");
    setKecamatanId("");
    setDesaId("");
    setKabupaten([]);
    setKecamatan([]);
    setDesa([]);
    if (!id) return;
    setKabupaten(await getRegencies(id));
  };

  const onChangeKabupaten = async (id: string) => {
    setKabupatenId(id);
    setKecamatanId("");
    setDesaId("");
    setKecamatan([]);
    setDesa([]);
    if (!id) return;
    setKecamatan(await getDistricts(id));
  };

  const onChangeKecamatan = async (id: string) => {
    setKecamatanId(id);
    setDesaId("");
    setDesa([]);
    if (!id) return;
    setDesa(await getVillages(id));
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !fullName ||
      !email ||
      !phone ||
      !provinsiId ||
      !kabupatenId ||
      !kecamatanId ||
      !desaId ||
      (passwordRequired && (!password || !confirmPassword))
    ) {
      setError("Semua field wajib diisi.");
      return;
    }

    if (passwordRequired && password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    if (passwordRequired && password !== confirmPassword) {
      setError("Konfirmasi password harus sama.");
      return;
    }

    setLoading(true);

    try {
      const geo = getCachedGeo();
      const referralCode =
        typeof window !== "undefined" ? localStorage.getItem("referral") || "0000" : "0000";

      const endpoint = isProfileCompletion ? "/api/users/me" : "/api/users";
      const method = isProfileCompletion ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(isProfileCompletion
          ? {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
              },
            }
          : {}),
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          ...(isProfileCompletion ? {} : { password, role: "user" }),
          referral_code: referralCode,
          prov_id: provinsiId,
          city_id: kabupatenId,
          dis_id: kecamatanId,
          desa_id: desaId,
          ip_address: geo.ip,
          device_location: geo.location,
          user_agent: navigator.userAgent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.message || "Gagal membuat akun.");
        return;
      }

      if (isProfileCompletion) {
        if (data.access_token) {
          localStorage.setItem("access_token", String(data.access_token));
        }
        if (data.user) {
          localStorage.setItem("auth_user", JSON.stringify(data.user));
          localStorage.setItem("completed_profile_user", JSON.stringify(data.user));
        }
      }

      localStorage.setItem(
        "register_meta",
        JSON.stringify({
          ip: geo.ip,
          location: geo.location,
          country: geo.country,
          referral: referralCode,
          registered_at: new Date().toISOString(),
          full_name: fullName.trim(),
          email: email.trim(),
        })
      );
      localStorage.setItem("savedEmail", email.trim());
      localStorage.setItem("prefill_login_email", email.trim());

      setSuccess(
        isProfileCompletion
          ? "Profil berhasil diperbarui. Anda akan diarahkan ke dashboard."
          : "Akun berhasil dibuat. Anda akan diarahkan ke login."
      );
      window.setTimeout(() => {
        router.push(isProfileCompletion ? "/menu" : "/login");
      }, 1200);
    } catch {
      setError("Tidak dapat terhubung ke API pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "h-12 rounded-[18px] bg-white/86 text-[15px] shadow-[0_8px_20px_rgba(109,87,43,0.08)]";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1180px] items-center px-3 py-3 sm:px-4 lg:px-5 lg:py-5">
      <div className="relative mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/40 shadow-[var(--shadow-strong)] sm:min-h-[calc(100dvh-2rem)] lg:rounded-[30px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/hero-makkah-kaabah.jpg')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(86,56,18,0.18)_0%,rgba(62,44,16,0.1)_26%,rgba(248,240,225,0.54)_70%,rgba(248,240,225,0.82)_100%)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.34),transparent_25%)]" aria-hidden />

        <Card className="relative z-10 my-4 w-[min(100%-1.5rem,460px)] rounded-[26px] border border-white/45 bg-[linear-gradient(180deg,rgba(255,252,246,0.84),rgba(253,246,235,0.7))] p-5 shadow-[0_24px_44px_rgba(75,53,19,0.18)] backdrop-blur-md sm:p-6 lg:max-w-[450px]">
          <div className="text-center">
            <BrandMark className="mx-auto h-14 w-14 sm:h-16 sm:w-16" />
            <h1 className="mt-3 font-[family-name:Arial,Helvetica,sans-serif] text-3xl font-black tracking-[0.08em] text-[var(--primary-deep)] sm:text-4xl">
              MUWAHID
            </h1>
            <p className="mt-1 text-base text-[var(--muted-strong)] sm:text-lg">
              {isProfileCompletion ? "Lengkapi Profil Anda" : "Daftar Akun Baru"}
            </p>
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleRegister}>
            <Input
              placeholder="Nama lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={fieldClass}
            />
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
            <Input
              placeholder="Nomor telepon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClass}
            />
            {passwordRequired ? (
              <>
                <Input
                  type="password"
                  placeholder="Kata Sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                />
                <Input
                  type="password"
                  placeholder="Konfirmasi Kata Sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                />
              </>
            ) : null}

            <Select
              value={provinsiId}
              onChange={(e) => void onChangeProvinsi(e.target.value)}
              className={fieldClass}
            >
              <option value="">Pilih Provinsi</option>
              {provinsi.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <Select
              value={kabupatenId}
              onChange={(e) => void onChangeKabupaten(e.target.value)}
              disabled={!provinsiId}
              className={fieldClass}
            >
              <option value="">Pilih Kabupaten / Kota</option>
              {kabupaten.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <Select
              value={kecamatanId}
              onChange={(e) => void onChangeKecamatan(e.target.value)}
              disabled={!kabupatenId}
              className={fieldClass}
            >
              <option value="">Pilih Kecamatan</option>
              {kecamatan.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <Select
              value={desaId}
              onChange={(e) => setDesaId(e.target.value)}
              disabled={!kecamatanId}
              className={fieldClass}
            >
              <option value="">Pilih Desa / Kelurahan</option>
              {desa.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

            <Button type="submit" className="h-12 w-full rounded-full text-base font-semibold" size="lg">
              {loading ? "Memproses..." : isProfileCompletion ? "Simpan Profil" : "Daftar"}
            </Button>
          </form>

          {!isProfileCompletion ? (
            <div className="mt-4 border-t border-[color:var(--line)] pt-4 text-center text-sm text-[var(--muted)]">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-semibold text-[var(--foreground)]">
                Masuk di sini
              </Link>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
