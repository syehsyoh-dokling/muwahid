export type AriRow = {
  date: string;
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  availability: number;
  rate: number;
  minStayArrival: number;
  stopSell: boolean;
};

export type BookingRevision = {
  id: string;
  booking_id: string;
  unique_id: string;
  ota_name: string;
  status: "new" | "modified" | "cancelled";
  property_id: string;
  arrival_date: string;
  departure_date: string;
  amount: string;
  currency: string;
  customer: {
    name: string;
    surname: string;
    mail: string;
  };
  rooms: Array<{
    room_type_id: string;
    rate_plan_id: string;
    checkin_date: string;
    checkout_date: string;
    occupancy: {
      adults: number;
      children: number;
      infants: number;
    };
  }>;
};

export const channexProperty = {
  id: "716305c4-561a-4561-a187-7f5b8aeb5920",
  name: "Muwahid Makkah Partner Hotel",
  currency: "SAR",
  timezone: "Asia/Riyadh",
};

export const roomMappings = [
  {
    roomTypeId: "994d1375-dbbd-4072-8724-b2ab32ce781b",
    roomTypeName: "Quad Umroh Room",
    localRoomCode: "MKK-QUAD",
    ratePlanId: "bab451e7-9ab1-4cc4-aa16-107bf7bbabb2",
    ratePlanName: "Refundable Breakfast",
    localRateCode: "RF-BF",
    channel: "Booking.com",
    status: "Mapped",
  },
  {
    roomTypeId: "41f0df0a-9d85-43ec-9741-6b717aa3b8a1",
    roomTypeName: "Triple Madinah Room",
    localRoomCode: "MED-TRP",
    ratePlanId: "c6b0f2ad-0940-48f7-9e91-a7a64a32bb70",
    ratePlanName: "Non Refundable Half Board",
    localRateCode: "NR-HB",
    channel: "Traveloka",
    status: "Mapped",
  },
  {
    roomTypeId: "d22f4c13-0d6f-4120-9e99-5f54b7b14722",
    roomTypeName: "Double Transit Room",
    localRoomCode: "JED-DBL",
    ratePlanId: "2bbfead9-3678-47f5-a6ef-0fc8a7cc0d22",
    ratePlanName: "Room Only",
    localRateCode: "RO",
    channel: "Expedia",
    status: "Needs review",
  },
] as const;

export const ariRows: AriRow[] = [
  {
    date: "2026-05-01",
    roomTypeId: roomMappings[0].roomTypeId,
    roomTypeName: roomMappings[0].roomTypeName,
    ratePlanId: roomMappings[0].ratePlanId,
    ratePlanName: roomMappings[0].ratePlanName,
    availability: 12,
    rate: 42000,
    minStayArrival: 2,
    stopSell: false,
  },
  {
    date: "2026-05-02",
    roomTypeId: roomMappings[0].roomTypeId,
    roomTypeName: roomMappings[0].roomTypeName,
    ratePlanId: roomMappings[0].ratePlanId,
    ratePlanName: roomMappings[0].ratePlanName,
    availability: 9,
    rate: 45500,
    minStayArrival: 2,
    stopSell: false,
  },
  {
    date: "2026-05-03",
    roomTypeId: roomMappings[1].roomTypeId,
    roomTypeName: roomMappings[1].roomTypeName,
    ratePlanId: roomMappings[1].ratePlanId,
    ratePlanName: roomMappings[1].ratePlanName,
    availability: 6,
    rate: 39000,
    minStayArrival: 3,
    stopSell: false,
  },
  {
    date: "2026-05-04",
    roomTypeId: roomMappings[2].roomTypeId,
    roomTypeName: roomMappings[2].roomTypeName,
    ratePlanId: roomMappings[2].ratePlanId,
    ratePlanName: roomMappings[2].ratePlanName,
    availability: 0,
    rate: 31000,
    minStayArrival: 1,
    stopSell: true,
  },
];

export const sampleBookingRevision: BookingRevision = {
  id: "brv_20260501_00042",
  booking_id: "bk_20260501_00042",
  unique_id: "bookingcom-47290018",
  ota_name: "Booking.com",
  status: "new",
  property_id: channexProperty.id,
  arrival_date: "2026-05-01",
  departure_date: "2026-05-06",
  amount: "2100.00",
  currency: "SAR",
  customer: {
    name: "Ahmad",
    surname: "Rahman",
    mail: "ahmad.rahman@example.test",
  },
  rooms: [
    {
      room_type_id: roomMappings[0].roomTypeId,
      rate_plan_id: roomMappings[0].ratePlanId,
      checkin_date: "2026-05-01",
      checkout_date: "2026-05-06",
      occupancy: {
        adults: 4,
        children: 0,
        infants: 0,
      },
    },
  ],
};

export function buildChannexAriPayload(rows: AriRow[]) {
  return {
    availability: {
      endpoint: "/api/v1/availability",
      body: {
        values: rows.map((row) => ({
          property_id: channexProperty.id,
          room_type_id: row.roomTypeId,
          date: row.date,
          availability: row.availability,
        })),
      },
    },
    restrictions: {
      endpoint: "/api/v1/restrictions",
      body: {
        values: rows.map((row) => ({
          property_id: channexProperty.id,
          rate_plan_id: row.ratePlanId,
          date: row.date,
          rate: row.rate,
          min_stay_arrival: row.minStayArrival,
          stop_sell: row.stopSell,
        })),
      },
    },
  };
}

export function buildWebhookReceipt(revision: BookingRevision) {
  const mappedRoom = roomMappings.find((room) => room.roomTypeId === revision.rooms[0]?.room_type_id);

  return {
    accepted: true,
    received_at: new Date().toISOString(),
    event: `booking_${revision.status}`,
    booking_revision_id: revision.id,
    local_reservation: {
      reservation_code: `MW-${revision.booking_id.slice(-5).toUpperCase()}`,
      guest_name: `${revision.customer.name} ${revision.customer.surname}`,
      source: revision.ota_name,
      room_code: mappedRoom?.localRoomCode ?? "UNMAPPED",
      rate_code: mappedRoom?.localRateCode ?? "UNMAPPED",
      checkin: revision.arrival_date,
      checkout: revision.departure_date,
      total: `${revision.currency} ${revision.amount}`,
    },
  };
}
