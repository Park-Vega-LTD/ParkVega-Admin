"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  type QrcodeSuccessCallback,
} from "html5-qrcode";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { clientFetch } from "@/lib/api.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Shape of the REST API `/tickets/checkin` success response as surfaced through
 * the BFF data proxy. The visitor name is optional — when absent the UI falls
 * back to a generic success message (Requirement 9.4).
 */
interface CheckinResponse {
  visitor_name?: string | null;
  visitor?: { name?: string | null } | null;
  [key: string]: unknown;
}

/** Visible result banner state after a check-in attempt. */
type ResultState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

/** The DOM id the html5-qrcode library renders the camera stream into. */
const SCANNER_ELEMENT_ID = "pv-gate-scanner-region";

/** Auto-clear delays per Requirements 9.4 (success) and 9.5/9.6 (error). */
const SUCCESS_CLEAR_MS = 3000;
const ERROR_CLEAR_MS = 5000;

/**
 * Staff gate scanner (Requirement 9).
 *
 * Initialises the device camera via `html5-qrcode` on mount. On a successful
 * decode it disables the scanner, shows a loading indicator, and submits the
 * scanned ticket code to the REST API check-in endpoint through the BFF data
 * proxy (`/api/tickets/checkin`). Success shows a green banner (with the
 * visitor name when present); 4xx shows the REST error message; 5xx/network
 * shows a generic server error. The scanner is re-enabled and the banner
 * cleared after a short delay. While a check-in is in flight, new scans are
 * blocked to prevent duplicate submissions.
 *
 * When camera access is denied or no camera is detected, a clear error message
 * is shown alongside a manual ticket-code entry field as a fallback
 * (Requirements 9.2, 9.8).
 */
export function GateScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Guards against double-submits: true from the moment a decode is accepted
  // until the scanner is re-enabled, so the decode callback ignores new scans.
  const busyRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [manualCode, setManualCode] = useState("");

  const mutation = useMutation<CheckinResponse, Error, string>({
    mutationFn: (ticketCode) =>
      clientFetch<CheckinResponse>("/api/tickets/checkin", {
        method: "POST",
        body: JSON.stringify({ ticket_code: ticketCode }),
      }),
  });

  /**
   * Resume the camera scanner (if it exists and is paused) and release the
   * in-flight guard so new scans are accepted again.
   */
  const reenableScanner = useCallback(() => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.getState() === Html5QrcodeScannerState.PAUSED) {
          scanner.resume();
        }
      } catch {
        /* scanner may have been torn down — safe to ignore */
      }
    }
    busyRef.current = false;
  }, []);

  /**
   * Submit a ticket code to the check-in endpoint and translate the outcome
   * into a result banner. Shared by both the camera decode path and the manual
   * entry fallback.
   */
  const submitCode = useCallback(
    async (rawCode: string) => {
      const ticketCode = rawCode.trim();
      if (!ticketCode) return;

      busyRef.current = true;

      // Pause the camera (if running) so no further frames are decoded while
      // the request is in flight (Requirement 9.7).
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
            scanner.pause(true);
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const response = await mutation.mutateAsync(ticketCode);
        const visitorName =
          response.visitor_name ?? response.visitor?.name ?? null;
        setResult({
          kind: "success",
          message: visitorName ? visitorName : "Check-in successful",
        });
        window.setTimeout(() => {
          setResult(null);
          reenableScanner();
        }, SUCCESS_CLEAR_MS);
      } catch (error) {
        // `clientFetch` throws a plain Error. Distinguish a client (4xx) error
        // — which carries a user-readable REST message — from a server/network
        // error, which gets a generic message (Requirements 9.5, 9.6).
        const message = resolveErrorMessage(error);
        setResult({ kind: "error", message });
        window.setTimeout(() => {
          setResult(null);
          reenableScanner();
        }, ERROR_CLEAR_MS);
      }
    },
    [mutation, reenableScanner],
  );

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    const onDecode: QrcodeSuccessCallback = (decodedText) => {
      // Ignore scans while a request is in flight or a result banner is shown.
      if (busyRef.current) return;
      void submitCode(decodedText);
    };

    async function start() {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cameras || cameras.length === 0) {
          setCameraError(
            "No camera was detected on this device. Enter the ticket code manually below.",
          );
          return;
        }

        scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, /* verbose */ false);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onDecode,
          undefined,
        );
      } catch {
        if (cancelled) return;
        // Covers permission denial and any other init failure (Req 9.2, 9.8).
        setCameraError(
          "Unable to access the camera. Camera permission may be blocked, or the device has no usable camera. Enter the ticket code manually below.",
        );
        scannerRef.current = null;
      }
    }

    void start();

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      if (active) {
        active
          .stop()
          .catch(() => {
            /* already stopped */
          })
          .finally(() => {
            try {
              active.clear();
            } catch {
              /* ignore */
            }
          });
        scannerRef.current = null;
      }
    };
  }, [submitCode]);

  function onManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || mutation.isPending) return;
    void submitCode(manualCode);
    setManualCode("");
  }

  const isBusy = mutation.isPending;

  return (
    <div className="space-y-6">
      {/* Camera scanner region (hidden when the camera is unavailable). */}
      {cameraError ? null : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div
            id={SCANNER_ELEMENT_ID}
            className="aspect-square w-full max-w-sm mx-auto"
            aria-label="Gate camera scanner"
          />
        </div>
      )}

      {/* In-flight loading indicator (Requirement 9.7). */}
      {isBusy ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm font-medium"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Checking in&hellip;
        </div>
      ) : null}

      {/* Result banner (Requirements 9.4, 9.5, 9.6). */}
      {result ? (
        <div
          role="alert"
          aria-live="assertive"
          className={
            result.kind === "success"
              ? "flex items-center gap-3 rounded-xl border border-green-600/30 bg-green-600/10 p-4 text-green-700 dark:text-green-400"
              : "flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive"
          }
        >
          {result.kind === "success" ? (
            <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="size-6 shrink-0" aria-hidden="true" />
          )}
          <p className="font-medium">{result.message}</p>
        </div>
      ) : null}

      {/* Camera error message + manual entry fallback (Req 9.2, 9.8). */}
      {cameraError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{cameraError}</p>
        </div>
      ) : null}

      {/* Manual ticket code entry — always available as a fallback, and the
          only input path when the camera cannot be initialised. */}
      <form onSubmit={onManualSubmit} className="space-y-2">
        <Label htmlFor="pv-manual-ticket-code">Enter ticket code manually</Label>
        <div className="flex gap-2">
          <Input
            id="pv-manual-ticket-code"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="e.g. TK-XXXXXXXX"
            autoComplete="off"
            disabled={isBusy}
          />
          <Button type="submit" disabled={isBusy || manualCode.trim() === ""}>
            Check in
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Map a thrown error from `clientFetch` to a banner message.
 *
 * `clientFetch` throws `Error(body.message ?? 'Request failed <status>')` on any
 * non-2xx response and a native `TypeError` ("Failed to fetch") on a network
 * failure. We treat a recognised REST message as a 4xx client error and show it
 * verbatim (Requirement 9.5), and fall back to a generic server message for
 * network failures and server-side errors (Requirement 9.6).
 */
function resolveErrorMessage(error: unknown): string {
  const SERVER_FALLBACK = "Server error, please try again";

  if (!(error instanceof Error)) return SERVER_FALLBACK;

  const message = error.message;

  // Network failure surfaced by fetch — no response body was available.
  if (message === "Failed to fetch" || message.startsWith("NetworkError")) {
    return SERVER_FALLBACK;
  }

  // `clientFetch` synthesises this message only when the response body had no
  // `message` field — for a 5xx that means a generic server error.
  const synthesised = /^Request failed (\d{3})$/.exec(message);
  if (synthesised) {
    const status = Number(synthesised[1]);
    return status >= 500 ? SERVER_FALLBACK : message;
  }

  // Otherwise this is a user-readable REST API error message (4xx).
  return message;
}
