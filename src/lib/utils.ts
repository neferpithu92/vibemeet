import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility per combinare classi Tailwind CSS con gestione conflitti.
 * Usa clsx per costruzione condizionale + tailwind-merge per deduplicazione.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
