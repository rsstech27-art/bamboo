import type { InsertProfileCatalog } from "@workspace/db";

export const OFFICIAL_PROFILE_CATALOG: InsertProfileCatalog[] = [
  {
    kind: "connector",
    article: "MC-06",
    name: "Соединительный профиль",
    colors: ["black", "gold", "bronze", "metallic"],
    lengthMm: 3000,
    panelThicknessesMm: [5, 8],
  },
  {
    kind: "gap",
    article: "MC-07",
    name: "Соединительный профиль с разрывом",
    colors: ["black", "gold", "bronze", "metallic"],
    lengthMm: 3000,
    panelThicknessesMm: [5, 8],
  },
  {
    kind: "light",
    article: "DL-01",
    name: "Соединительный профиль с подсветкой",
    colors: ["black"],
    lengthMm: 3000,
    panelThicknessesMm: [5, 8],
  },
];