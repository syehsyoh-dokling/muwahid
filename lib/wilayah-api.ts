const defaultWilayahBase = "/api/wilayah";

export const wilayahApiBaseUrl =
  process.env.NEXT_PUBLIC_WILAYAH_API_BASE?.replace(/\/$/, "") || defaultWilayahBase;

type WilayahItem = {
  id: string;
  name: string;
};

type WilayahResponse = {
  success?: boolean;
  data?: WilayahItem[];
};

async function fetchWilayah(path: string) {
  const res = await fetch(`${wilayahApiBaseUrl}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Gagal memuat data wilayah.");
  }

  const json = (await res.json()) as WilayahResponse;
  return Array.isArray(json.data) ? json.data : [];
}

export function getProvinces() {
  return fetchWilayah("/provinces");
}

export function getRegencies(provinceId: string) {
  return fetchWilayah(`/regencies/${encodeURIComponent(provinceId)}`);
}

export function getDistricts(regencyId: string) {
  return fetchWilayah(`/districts/${encodeURIComponent(regencyId)}`);
}

export function getVillages(districtId: string) {
  return fetchWilayah(`/villages/${encodeURIComponent(districtId)}`);
}
