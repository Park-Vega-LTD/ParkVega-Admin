import type { Metadata } from "next";

import { GateScanner } from "@/components/parkvega/gate-scanner";

// The gate scanner is a live, camera-driven client tool — never cache it.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    // Title: 32 chars (<= 60)
    title: "Gate Scanner | Park Vega Staff",
    // Description: 135 chars (<= 160)
    description:
      "Scan visitor ticket QR codes at the Park Vega gate to verify and check in guests, with manual code entry as a fallback.",
  };
}

export default function GateScannerPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Gate Scanner
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the camera at a visitor&apos;s ticket QR code to check them in.
        </p>
      </header>

      <GateScanner />
    </section>
  );
}
