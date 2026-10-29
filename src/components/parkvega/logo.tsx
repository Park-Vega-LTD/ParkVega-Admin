import Image from "next/image";
import { Waves } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The official Park Vega logo files (brand guide §2.3). The full-colour logo
 * has a white outline, so the same file works on light and dark backgrounds.
 * Replace with a larger or SVG export here when one is available.
 */
const LOGO_FILES: {
  full: { src: string; width: number; height: number } | null;
  /** Light version for dark backgrounds (hero, footer bands). */
  fullOnDark: { src: string; width: number; height: number } | null;
} = {
  full: { src: "/brand/park-vega-logo.png", width: 288, height: 186 },
  fullOnDark: null,
};

/**
 * Park Vega brand mark. `tone` picks the version for the background it sits
 * on; `size` scales it for compact spots ("sm"), navigation ("md") or the
 * homepage billboard ("lg").
 */
export function Logo({
  tone = "onLight",
  size = "md",
  className,
}: {
  tone?: "onLight" | "onDark";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const file = tone === "onDark" ? (LOGO_FILES.fullOnDark ?? LOGO_FILES.full) : LOGO_FILES.full;
  // Header 56px, compact spots 40px, homepage billboard 80px.
  const height = { sm: 40, md: 56, lg: 80 }[size];

  if (file) {
    return (
      <Image
        src={file.src}
        alt="Park Vega Waterpark"
        width={Math.round((file.width / file.height) * height)}
        height={height}
        preload={size === "lg"}
        className={className}
      />
    );
  }

  // Fallback wordmark, used only if no logo file is configured above.
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-primary text-primary-foreground",
          size === "sm" ? "size-8" : "size-10",
          size === "lg" && "size-12",
        )}
        aria-hidden="true"
      >
        <Waves className={size === "sm" ? "size-5" : "size-6"} />
      </span>
      <span
        className={cn(
          "font-display font-bold leading-none",
          size === "sm" ? "text-lg" : "text-xl",
          tone === "onDark" ? "text-hero-foreground" : "text-foreground",
        )}
      >
        Park <span className={tone === "onDark" ? "text-primary" : "text-primary-ink"}>Vega</span>
      </span>
    </span>
  );
}
