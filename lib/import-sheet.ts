import ExcelJS from "exceljs";

function textOf(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return "";
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string" && value.hyperlink.toLowerCase().startsWith("mailto:")) {
      return value.hyperlink.slice("mailto:".length).split("?")[0];
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return textOf(value.result as ExcelJS.CellValue);
  }
  return "";
}

export async function readXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const maxRow = Math.min(sheet.rowCount || 0, 400);
  const maxCol = Math.min(sheet.columnCount || 0, 40);
  const table: string[][] = [];
  for (let rowNumber = 1; rowNumber <= maxRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: string[] = [];
    for (let column = 1; column <= maxCol; column += 1) {
      cells.push(textOf(row.getCell(column).value).trim());
    }
    table.push(cells);
  }
  return table;
}
