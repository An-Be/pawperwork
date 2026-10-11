import { describe, expect, it } from "vitest";
import { canOnboard } from "./onboarding-gate";

describe("canOnboard", () => {
  it("lets anyone in when sign-ups are open", () => {
    expect(canOnboard("someone@example.com", true, undefined)).toBe(true);
  });

  it("allows only listed emails while closed, ignoring case and spaces", () => {
    const list = " Owner@Pawperwork.pet , test@example.com ";
    expect(canOnboard("owner@pawperwork.pet", false, list)).toBe(true);
    expect(canOnboard(" TEST@example.com", false, list)).toBe(true);
    expect(canOnboard("stranger@example.com", false, list)).toBe(false);
  });

  it("refuses everyone while closed with no list, an empty list or no email", () => {
    expect(canOnboard("owner@pawperwork.pet", false, undefined)).toBe(false);
    expect(canOnboard("owner@pawperwork.pet", false, "")).toBe(false);
    expect(canOnboard("owner@pawperwork.pet", false, " , ")).toBe(false);
    expect(canOnboard("", false, "a@b.co,")).toBe(false);
  });
});
