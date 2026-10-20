export type Cell = string | number | boolean | null | undefined;

export type AdsRow = {
  date: string;
  campaign: string;
  clicks: number | null;
  spend: number | null;
  impressions: number | null;
  conversions: number | null;
};

export type Ga4Row = {
  date: string;
  sessions: number | null;
};

export type EventRow = {
  date: string;
  eventName: string;
  eventCount: number | null;
};

export type ProfileRow = {
  date: string;
  impressions: number | null;
  callClicks: number | null;
  websiteClicks: number | null;
};

export type ParseResult<T> =
  | { ok: true; rows: T[]; headers: string[] }
  | { ok: false; error: string };

const FIELD_ALIASES: Record<string, string> = {
  date: "date",
  day: "date",
  campaign: "campaign",
  campaignname: "campaign",
  clicks: "clicks",
  spend: "spend",
  spendgbp: "spend",
  cost: "spend",
  costgbp: "spend",
  impressions: "impressions",
  conversions: "conversions",
  sessions: "sessions",
  eventcount: "event_count",
  totalevents: "event_count",
  eventname: "event_name",
  callclicks: "call_clicks",
  phonecalls: "call_clicks",
  websiteclicks: "website_clicks",
};

export function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseNumber(raw: Cell): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "boolean") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let text = raw.trim();
  if (!text || text === "-" || text === "—" || /^n\/?a$/i.test(text)) return null;
  text = text.replace(/£/g, "").replace(/\s/g, "");
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/,/g, "");
  } else if (text.includes(",")) {
    const parts = text.split(",");
    if (parts.length > 1 && parts.every((part, index) => index === 0 || part.length === 3)) {
      text = text.replace(/,/g, "");
    } else {
      text = text.replace(",", ".");
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function validIso(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDate(raw: Cell): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && raw > 20000 && raw < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(raw) * 86400000);
    const iso = utc.toISOString().slice(0, 10);
    return validIso(iso) ? iso : null;
  }
  const text = String(raw).trim();
  const isoPrefix = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  if (isoPrefix && validIso(isoPrefix[1])) return isoPrefix[1];
  if (/^\d{8}$/.test(text)) {
    const iso = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
    return validIso(iso) ? iso : null;
  }
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (uk) {
    const iso = `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
    return validIso(iso) ? iso : null;
  }
  return null;
}

function headerMap(headers: Cell[]): { fields: Record<string, number>; labels: string[] } | null {
  const fields: Record<string, number> = {};
  const labels = headers.map((cell) => String(cell ?? "").trim());
  let recognised = 0;
  labels.forEach((label, index) => {
    const field = FIELD_ALIASES[normaliseHeader(label)];
    if (!field || fields[field] != null) return;
    fields[field] = index;
    recognised += 1;
  });
  if (!labels.some((label) => label) || recognised === 0 || fields.date == null) return null;
  return { fields, labels };
}

function cell(row: Cell[], index: number | undefined): Cell {
  if (index == null) return null;
  return row[index];
}

function isBlank(row: Cell[]): boolean {
  return row.every((value) => value == null || String(value).trim() === "");
}

function readRows<T>(
  grid: Cell[][],
  mapRow: (row: Cell[], fields: Record<string, number>) => T | null
): ParseResult<T> {
  const start = grid.findIndex((row) => !isBlank(row));
  if (start < 0) return { ok: true, rows: [], headers: [] };
  const mapped = headerMap(grid[start]);
  if (!mapped) return { ok: false, error: "Date column was not found." };
  const rows: T[] = [];
  for (const row of grid.slice(start + 1)) {
    if (isBlank(row)) continue;
    const parsed = mapRow(row, mapped.fields);
    if (parsed) rows.push(parsed);
  }
  return { ok: true, rows, headers: mapped.labels.filter(Boolean) };
}

export function parseAds(grid: Cell[][]): ParseResult<AdsRow> {
  return readRows(grid, (row, fields) => {
    const date = parseDate(cell(row, fields.date));
    if (!date) return null;
    return {
      date,
      campaign: String(cell(row, fields.campaign) ?? "").trim() || "(not set)",
      clicks: parseNumber(cell(row, fields.clicks)),
      spend: parseNumber(cell(row, fields.spend)),
      impressions: parseNumber(cell(row, fields.impressions)),
      conversions: parseNumber(cell(row, fields.conversions)),
    };
  });
}

export function parseGa4(grid: Cell[][]): ParseResult<Ga4Row> {
  return readRows(grid, (row, fields) => {
    const date = parseDate(cell(row, fields.date));
    if (!date || fields.sessions == null) return null;
    return { date, sessions: parseNumber(cell(row, fields.sessions)) };
  });
}

export function parseEvents(grid: Cell[][]): ParseResult<EventRow> {
  return readRows(grid, (row, fields) => {
    const date = parseDate(cell(row, fields.date));
    const eventName = String(cell(row, fields.event_name) ?? "").trim();
    if (!date || !eventName) return null;
    return {
      date,
      eventName,
      eventCount: parseNumber(cell(row, fields.event_count)),
    };
  });
}

export function parseProfile(grid: Cell[][]): ParseResult<ProfileRow> {
  return readRows(grid, (row, fields) => {
    const date = parseDate(cell(row, fields.date));
    if (!date) return null;
    return {
      date,
      impressions: parseNumber(cell(row, fields.impressions)),
      callClicks: parseNumber(cell(row, fields.call_clicks)),
      websiteClicks: parseNumber(cell(row, fields.website_clicks)),
    };
  });
}
