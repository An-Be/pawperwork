import { Cat, Dog, PawPrint } from "lucide-react";

/** A small species-aware icon, used anywhere a pet gets an avatar badge. */
export function speciesIcon(species: string) {
  const normalized = species.trim().toLowerCase();
  if (normalized === "dog") return Dog;
  if (normalized === "cat") return Cat;
  return PawPrint;
}
