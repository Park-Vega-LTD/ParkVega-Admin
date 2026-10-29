"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Props for {@link MediaUploader} (design Section 12 — `MediaUploader`).
 */
export interface MediaUploaderProps {
  /**
   * Maximum allowed file size in bytes. A file larger than this is rejected
   * client-side before any network request is made.
   */
  maxSize: number;
  /**
   * Called with the validated {@link File} when the admin confirms the upload.
   * May be async; the uploader reflects the in-flight state via `isUploading`.
   */
  onUpload: (file: File) => void | Promise<void>;
  /** Optional flag indicating an upload is in flight (disables the controls). */
  isUploading?: boolean;
  /** Optional `accept` attribute forwarded to the underlying file input. */
  accept?: string;
  className?: string;
}

/** Error message shown when a file exceeds the configured size limit. */
export const FILE_TOO_LARGE_MESSAGE = "File exceeds the 50 MB limit";

/**
 * `MediaUploader` — a file input with a hard client-side size guard.
 *
 * The guard runs on {@link File.size} the moment a file is chosen or the
 * upload is submitted: if the file is larger than `maxSize` the component
 * displays {@link FILE_TOO_LARGE_MESSAGE} and does NOT invoke `onUpload`, so
 * no network request is ever made for an oversized file (Requirement 11.10).
 *
 * Validates: Requirements 11.10
 */
export function MediaUploader({
  maxSize,
  onUpload,
  isUploading = false,
  accept,
  className,
}: MediaUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);

    if (selected && selected.size > maxSize) {
      // Reject before any network request is made (Requirement 11.10).
      setError(FILE_TOO_LARGE_MESSAGE);
      setFile(null);
      // Clear the native input so re-selecting the same file re-triggers change.
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(selected);
  }

  function handleUpload() {
    if (!file) return;

    // Guard again at submit time so an oversized file can never be submitted,
    // even if local state were manipulated (Requirement 11.10).
    if (file.size > maxSize) {
      setError(FILE_TOO_LARGE_MESSAGE);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError(null);
    void onUpload(file);
  }

  function reset() {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="media-uploader-input">Media file</Label>
        <Input
          id="media-uploader-input"
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={isUploading}
          onChange={handleSelect}
          aria-describedby={error ? "media-uploader-error" : undefined}
          aria-invalid={error ? true : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Maximum file size: {Math.round(maxSize / (1024 * 1024))} MB.
        </p>
      </div>

      {error ? (
        <p
          id="media-uploader-error"
          role="alert"
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          <UploadCloud className="size-4" />
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
        {file ? (
          <>
            <span className="truncate text-sm text-muted-foreground">
              {file.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={isUploading}
            >
              Clear
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
