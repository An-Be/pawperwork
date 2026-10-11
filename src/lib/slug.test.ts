import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("makes a URL-safe slug", () => {
    expect(slugify("Paws & Claws Grooming Co.")).toBe("paws-claws-grooming-co");
    expect(slugify("Café Perro")).toBe("cafe-perro");
    expect(slugify("  --  ")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("adds a number until the slug is free", async () => {
    const taken = new Set(["happy-tails", "happy-tails-2"]);
    expect(await uniqueSlug("Happy Tails", async (s) => taken.has(s))).toBe("happy-tails-3");
  });

  it("falls back to 'business' for a name with no usable characters", async () => {
    expect(await uniqueSlug("!!!", async () => false)).toBe("business");
  });
});
