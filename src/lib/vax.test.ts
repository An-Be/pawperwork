import { describe, expect, it } from "vitest";
import {
  currentRecordForType,
  daysUntil,
  dueReminder,
  parseVaxRequirements,
  statusForRecord,
  summarizePet,
  worstStatus,
} from "./vax";

const NOW = new Date("2026-06-15T15:30:00Z");
const day = (offset: number) => new Date(Date.UTC(2026, 5, 15 + offset));

describe("daysUntil", () => {
  it("counts whole UTC days, ignoring the time of day", () => {
    expect(daysUntil(day(0), NOW)).toBe(0);
    expect(daysUntil(day(1), NOW)).toBe(1);
    expect(daysUntil(day(-3), NOW)).toBe(-3);
  });
});

describe("statusForRecord", () => {
  it("is MISSING with no record or no expiry date", () => {
    expect(statusForRecord(undefined, NOW)).toBe("MISSING");
    expect(statusForRecord({ type: "Rabies", expiresAt: null }, NOW)).toBe("MISSING");
  });

  it("is EXPIRING from 30 days out through the expiry day itself", () => {
    expect(statusForRecord({ type: "Rabies", expiresAt: day(31) }, NOW)).toBe("VALID");
    expect(statusForRecord({ type: "Rabies", expiresAt: day(30) }, NOW)).toBe("EXPIRING");
    expect(statusForRecord({ type: "Rabies", expiresAt: day(0) }, NOW)).toBe("EXPIRING");
    expect(statusForRecord({ type: "Rabies", expiresAt: day(-1) }, NOW)).toBe("EXPIRED");
  });
});

describe("currentRecordForType", () => {
  it("prefers the record that expires furthest out, case-insensitively", () => {
    const old = { type: "rabies", expiresAt: day(-10) };
    const renewal = { type: "Rabies ", expiresAt: day(300) };
    const undated = { type: "Rabies", expiresAt: null };
    expect(currentRecordForType([old, undated, renewal], "Rabies")).toBe(renewal);
  });

  it("prefers a dated record over an undated one", () => {
    const undated = { type: "Rabies", expiresAt: null };
    const dated = { type: "Rabies", expiresAt: day(-5) };
    expect(currentRecordForType([undated, dated], "Rabies")).toBe(dated);
  });
});

describe("summarizePet", () => {
  const requirements = [
    { name: "Rabies", required: true },
    { name: "Bordetella", required: false },
  ];

  it("takes the worst status across required types only", () => {
    const summary = summarizePet(
      [
        { type: "Rabies", expiresAt: day(10), verified: false },
        { type: "Bordetella", expiresAt: day(-30), verified: true },
      ],
      requirements,
      NOW,
    );
    expect(summary.overall).toBe("EXPIRING");
    expect(summary.unverifiedCount).toBe(1);
  });

  it("keeps records for types the business no longer requires", () => {
    const summary = summarizePet([{ type: "Lepto", expiresAt: day(100) }], requirements, NOW);
    expect(summary.byType.map((entry) => entry.type)).toEqual(["Rabies", "Bordetella", "Lepto"]);
    expect(summary.overall).toBe("MISSING");
  });
});

describe("worstStatus", () => {
  it("ranks MISSING above EXPIRED and is VALID for nothing", () => {
    expect(worstStatus(["VALID", "EXPIRED", "MISSING"])).toBe("MISSING");
    expect(worstStatus([])).toBe("VALID");
  });
});

describe("dueReminder", () => {
  it("fires one disjoint window per record", () => {
    expect(dueReminder(day(31), NOW)).toBeNull();
    expect(dueReminder(day(30), NOW)).toBe("EXPIRING_30");
    expect(dueReminder(day(15), NOW)).toBe("EXPIRING_30");
    expect(dueReminder(day(14), NOW)).toBe("EXPIRING_14");
    expect(dueReminder(day(8), NOW)).toBe("EXPIRING_14");
    expect(dueReminder(day(7), NOW)).toBe("EXPIRING_7");
    expect(dueReminder(day(0), NOW)).toBe("EXPIRING_7");
    expect(dueReminder(day(-1), NOW)).toBeNull();
    expect(dueReminder(day(-7), NOW)).toBe("EXPIRED");
    expect(dueReminder(null, NOW)).toBeNull();
  });
});

describe("parseVaxRequirements", () => {
  it("drops junk, trims, and dedupes case-insensitively", () => {
    expect(
      parseVaxRequirements([
        { name: " Rabies ", required: true },
        { name: "rabies", required: false },
        { name: "", required: true },
        { name: 42 },
        null,
        { name: "Distemper", required: "yes" },
      ]),
    ).toEqual([
      { name: "Rabies", required: true },
      { name: "Distemper", required: false },
    ]);
    expect(parseVaxRequirements("nope")).toEqual([]);
  });
});
