/**
 * CSV export helpers for admin reports.
 */

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function sendCsvResponse(res, filename, headers, rows) {
  const csv = rowsToCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.status(200).send(`\uFEFF${csv}`);
}

export default { rowsToCsv, sendCsvResponse, escapeCsvValue };
