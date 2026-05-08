import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * @typedef {import('clsx').ClassValue} ClassValue
 */

/**
 * @param {...ClassValue} inputs
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
