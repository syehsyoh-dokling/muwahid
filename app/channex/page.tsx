"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  Building2,
  CheckCircle2,
  CloudUpload,
  Copy,
  Hotel,
  Link2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ariRows,
  buildChannexAriPayload,
  channexProperty,
  roomMappings,
  sampleBookingRevision,
} from "@/lib/channex-demo";

type ApiState = {
  label: string;
  payload: unknown;
} | null;

const workflow = [
  {
    icon: Building2,
    title: "Property mapping",
    text: "Simpan Channex property_id, room_type_id, rate_plan_id, lalu hubungkan dengan kode kamar lokal PMS.",
  },
  {
    icon: CloudUpload,
    title: "ARI push",
    text: "Kirim availability ke /availability dan rate/restriction ke /restrictions dengan format values.",
  },
  {
    icon: Webhook,
    title: "Booking webhook",
    text: "Terima event booking_new, booking_modification, booking_cancellation, lalu ubah menjadi reservasi lokal.",
  },
  {
    icon: ShieldCheck,
    title: "Audit & retry",
    text: "Catat task id, warning, payload, dan status agar kegagalan mapping bisa ditangani ulang.",
  },
];

export default function ChannexIntegrationPage() {
  const router = useRouter();
  const [apiState, setApiState] = useState<ApiState>(null);
  const [loading, setLoading] = useState<"ari" | "webhook" | null>(null);
  const payload = useMemo(() => buildChannexAriPayload(ariRows), []);

  const syncAri = async () => {
    setLoading("ari");
    try {
      const response = await fetch("/api/channex/ari", { method: "POST" });
      const data = await response.json();
      setApiState({ label: "ARI sync response", payload: data });
    } finally {
      setLoading(null);
    }
  };

  const simulateWebhook = async () => {
    setLoading("webhook");
    try {
      const response = await fetch("/api/channex/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleBookingRevision),
      });
      const data = await response.json();
      setApiState({ label: "Webhook receiver response", payload: data });
    } finally {
      setLoading(null);
    }
  };

  const copyPayload = async () => {
    const text = JSON.stringify(apiState?.payload ?? payload, null, 2);
    await navigator.clipboard.writeText(text);
  };

  return (
    <main className="min-h-screen bg-[#f7f4ec] text-[#17231f]">
      <section className="border-b border-[#d9ded8] bg-[#fbfaf6]">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#cfd8d2] bg-white text-[#265c55] shadow-sm"
              aria-label="Kembali"
              title="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#50625c]">
              <span className="rounded-full border border-[#d9ded8] bg-white px-3 py-2">PHP/Laravel ready</span>
              <span className="rounded-full border border-[#d9ded8] bg-white px-3 py-2">Channex PMS flow</span>
              <span className="rounded-full border border-[#d9ded8] bg-white px-3 py-2">Mock safe mode</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b57918]">Integration proof project</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-normal text-[#13241f] sm:text-5xl">
                Channex.io PMS Connector untuk hotel umroh
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#52605b]">
                Contoh proyek yang memperlihatkan pengalaman integrasi Channex: mapping property/room/rate plan, push
                availability dan restrictions, serta receiver webhook booking dari channel OTA.
              </p>
            </div>

            <div className="grid gap-3 rounded-lg border border-[#d9ded8] bg-white p-4 shadow-sm sm:grid-cols-3">
              <Metric label="Property" value="1" />
              <Metric label="Room mappings" value={String(roomMappings.length)} />
              <Metric label="ARI rows" value={String(ariRows.length)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1320px] gap-5 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-4">
          <div className="rounded-lg border border-[#d9ded8] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e7f3ef] text-[#17685f]">
                <Hotel className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{channexProperty.name}</p>
                <p className="text-xs text-[#6a756f]">{channexProperty.currency} / {channexProperty.timezone}</p>
              </div>
            </div>
            <div className="mt-4 rounded-md bg-[#f4f7f5] p-3 font-mono text-[11px] leading-5 text-[#43534d]">
              {channexProperty.id}
            </div>
          </div>

          <div className="rounded-lg border border-[#d9ded8] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold">Endpoint demo</p>
            <div className="mt-3 space-y-2 text-sm text-[#52605b]">
              <Endpoint icon={CloudUpload} label="POST /api/channex/ari" />
              <Endpoint icon={Webhook} label="POST /api/channex/webhook" />
              <Endpoint icon={Link2} label="GET /api/channex/ari" />
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            {workflow.map((item) => (
              <div key={item.title} className="rounded-lg border border-[#d9ded8] bg-white p-4 shadow-sm">
                <item.icon className="h-5 w-5 text-[#17685f]" />
                <h2 className="mt-3 text-sm font-extrabold">{item.title}</h2>
                <p className="mt-2 text-xs leading-6 text-[#5c6862]">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
            <div className="space-y-5">
              <Panel title="Room & rate mapping" icon={Link2}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#d9ded8] text-xs uppercase tracking-[0.14em] text-[#6a756f]">
                        <th className="py-3 pr-4">Local</th>
                        <th className="py-3 pr-4">Channex room</th>
                        <th className="py-3 pr-4">Rate plan</th>
                        <th className="py-3 pr-4">Channel</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomMappings.map((room) => (
                        <tr key={room.roomTypeId} className="border-b border-[#edf0ed]">
                          <td className="py-3 pr-4 font-semibold">{room.localRoomCode} / {room.localRateCode}</td>
                          <td className="py-3 pr-4">
                            <div className="font-medium">{room.roomTypeName}</div>
                            <div className="font-mono text-[11px] text-[#77827d]">{room.roomTypeId}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-medium">{room.ratePlanName}</div>
                            <div className="font-mono text-[11px] text-[#77827d]">{room.ratePlanId}</div>
                          </td>
                          <td className="py-3 pr-4">{room.channel}</td>
                          <td className="py-3">
                            <span className="rounded-full bg-[#e9f4ee] px-3 py-1 text-xs font-bold text-[#17685f]">
                              {room.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="ARI update queue" icon={RefreshCcw}>
                <div className="grid gap-3 md:grid-cols-2">
                  {ariRows.map((row) => (
                    <div key={`${row.ratePlanId}-${row.date}`} className="rounded-lg border border-[#dde5df] bg-[#fbfcfa] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold">{row.date}</p>
                        <span className={row.stopSell ? "text-xs font-bold text-[#a43b2f]" : "text-xs font-bold text-[#17685f]"}>
                          {row.stopSell ? "Stop sell" : "Open"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#52605b]">{row.roomTypeName}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <MiniMetric label="Avail" value={String(row.availability)} />
                        <MiniMetric label="Rate" value={`${row.rate}`} />
                        <MiniMetric label="Min" value={`${row.minStayArrival}N`} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="space-y-5">
              <Panel title="Run integration" icon={BellRing}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={syncAri}
                    disabled={loading !== null}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#17685f] px-4 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                  >
                    {loading === "ari" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                    Sync ARI
                  </button>
                  <button
                    type="button"
                    onClick={simulateWebhook}
                    disabled={loading !== null}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] bg-white px-4 text-sm font-bold text-[#17685f] shadow-sm disabled:opacity-60"
                  >
                    {loading === "webhook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
                    Simulate booking
                  </button>
                </div>
                <p className="mt-3 text-xs leading-6 text-[#65716b]">
                  Tanpa CHANNEX_API_KEY, API berjalan di mock mode. Jika env diset, route akan mengirim payload ke
                  Channex staging dengan header user-api-key.
                </p>
              </Panel>

              <Panel title={apiState?.label ?? "Generated Channex payload"} icon={CheckCircle2}>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={copyPayload}
                    className="mb-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#cfd8d2] bg-white px-3 text-xs font-bold text-[#17685f]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy JSON
                  </button>
                </div>
                <pre className="max-h-[560px] overflow-auto rounded-lg bg-[#17231f] p-4 text-xs leading-6 text-[#dceee8]">
                  {JSON.stringify(apiState?.payload ?? payload, null, 2)}
                </pre>
              </Panel>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-[#17685f]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#6a756f]">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-2">
      <p className="font-black text-[#17231f]">{value}</p>
      <p className="mt-1 uppercase tracking-[0.12em] text-[#77827d]">{label}</p>
    </div>
  );
}

function Endpoint({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#17685f]" />
      <span className="font-mono text-xs">{label}</span>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#d9ded8] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e7f3ef] text-[#17685f]">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
