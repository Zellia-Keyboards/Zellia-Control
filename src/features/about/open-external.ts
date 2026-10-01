/** Opens an external page in a new tab without giving it access to this window. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
