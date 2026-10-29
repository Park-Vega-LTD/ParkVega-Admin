import type { Attraction } from "@/types/api";

export const THRILL_LEVELS = ["Gentle", "Moderate", "High", "Extreme"];

/** The attraction-page fields the brief requires (§10), for completeness checks. */
const REQUIRED_FIELDS: { key: keyof Attraction; label: string }[] = [
  { key: "image_url", label: "Photo" },
  { key: "who_it_suits", label: "Who it suits" },
  { key: "thrill_level", label: "Thrill level" },
  { key: "height_requirement", label: "Height requirement" },
  { key: "safety_precautions", label: "Safety precautions" },
];

export function missingFields(attraction: Attraction) {
  return REQUIRED_FIELDS.filter(({ key }) => !attraction[key]).map(({ label }) => label);
}

/** Safety precautions are stored one per line. */
export function safetyList(attraction: Attraction) {
  return (attraction.safety_precautions ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}
