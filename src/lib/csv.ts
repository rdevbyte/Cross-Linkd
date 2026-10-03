/**
 * CSV output helpers (RFC 4180) with spreadsheet formula-injection protection.
 *
 * Listing names, cities and similar fields are user-controlled. A cell that
 * begins with `=`, `+`, `-`, `@`, TAB or CR is executed as a formula by Excel,
 * Google Sheets and LibreOffice (`=HYPERLINK(...)`, DDE payloads, data exfiltration),
 * so such text cells are prefixed with an apostrophe, which spreadsheets treat as
 * "this is text". Real numbers are written as-is so negative values stay numeric.
 */
export function csvCell(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Header + rows → CSV text. A UTF-8 BOM keeps non-ASCII names intact when opened in Excel. */
export function toCsv(header: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const lines = [header.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
