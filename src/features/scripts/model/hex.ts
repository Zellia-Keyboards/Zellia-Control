/** Bytes as lines of `perLine`: the offset, then the bytes, e.g. `0000  fb ac 01 00`. */
export function formatHex(bytes: readonly number[], perLine = 16): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += perLine) {
    const row = bytes
      .slice(offset, offset + perLine)
      .map(byte => byte.toString(16).padStart(2, '0'));
    lines.push(`${offset.toString(16).padStart(4, '0')}  ${row.join(' ')}`);
  }
  return lines.join('\n');
}
