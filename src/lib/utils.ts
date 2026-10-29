import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatNaira = (value: number | string) =>
  `₦${Number(value).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`
