export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSheetData {
  sheetName: string;
  title: string;
  columns: ExcelColumn[];
  data: any[];
}

function sanitizeSheetName(name: string): string {
  const safe = (name || 'Sheet')
    .replace(/[\\\/\?\*\[\]\:]/g, '_')
    .trim()
    .slice(0, 31);
  return safe || 'Sheet1';
}

function buildWorksheet(worksheet: any, title: string, columns: ExcelColumn[], data: any[]) {
  worksheet.views = [{ rightToLeft: true }];

  // 1. Title Row
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleRow = worksheet.getRow(1);
  titleRow.height = 36;
  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF099A75' } // Calm WMS Brand Emerald
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Metadata Subtitle Row
  worksheet.mergeCells(2, 1, 2, columns.length);
  const subRow = worksheet.getRow(2);
  subRow.height = 24;
  const subCell = subRow.getCell(1);
  const todayStr = new Date().toLocaleDateString('ar-EG');
  subCell.value = `منظومة Stockly WMS • تاريخ التصدير: ${todayStr} • إجمالي السجلات: ${data.length}`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Header Row
  const headerRow = worksheet.getRow(3);
  headerRow.height = 30;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF099A75' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // 4. Data Rows & Auto-fit calculation
  const colMaxLens = columns.map(c => c.header.length);

  let currentRowIdx = 4;

  data.forEach((item) => {
    const row = worksheet.getRow(currentRowIdx);

    // Group / Department Divider Banner Row
    if (item._isGroupHeader) {
      worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, columns.length);
      row.height = 30;
      const cell = row.getCell(1);
      cell.value = item.groupTitle || item.name || '';
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Executive dark navy slate
      };
      cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF099A75' } },
        bottom: { style: 'medium', color: { argb: 'FF099A75' } }
      };
      currentRowIdx++;
      return;
    }

    if (item._isGroupSummary) {
      worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, columns.length);
      row.height = 24;
      const cell = row.getCell(1);
      cell.value = item.summaryTitle || '';
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF065F46' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F4EA' } // Light calm mint
      };
      cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      currentRowIdx++;
      return;
    }

    row.height = 24;
    const isEven = currentRowIdx % 2 === 0;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const val = item[col.key];
      const isCodeCol = col.key === 'code' || col.key === 'itemCode';

      if (val !== undefined && val !== null) {
        if (isCodeCol) {
          cell.value = String(val);
          cell.numFmt = '@'; // Force text format to preserve exact code
        } else if (typeof val === 'number') {
          cell.value = val;
          cell.numFmt = Number.isInteger(val) ? '#,##0' : '#,##0.00';
        } else {
          cell.value = String(val);
        }
        const strLen = String(val).length;
        if (strLen > colMaxLens[colIdx]) colMaxLens[colIdx] = strLen;
      } else {
        cell.value = '—';
      }

      // Check for specific status highlights in Excel
      let textColor = isCodeCol ? { argb: 'FF099A75' } : { argb: 'FF1E293B' };
      if (col.key === 'stock') {
        const numStock = Number(val) || 0;
        textColor = numStock <= 0 ? { argb: 'FFEF4444' } : { argb: 'FF099A75' };
      } else if (col.key === 'totalOut') {
        textColor = { argb: 'FF2563EB' }; // Executive Blue
      } else if (col.key === 'status') {
        const strVal = String(val || '');
        if (strVal.includes('منتهي') || strVal.includes('حرج') || strVal.includes('Out')) {
          textColor = { argb: 'FFEF4444' };
        } else if (strVal.includes('منخفض') || strVal.includes('Low')) {
          textColor = { argb: 'FFD97706' }; // Amber
        } else if (strVal.includes('آمن') || strVal.includes('Safe') || strVal.includes('نشط')) {
          textColor = { argb: 'FF10B981' };
        }
      }

      cell.font = { 
        name: 'Segoe UI', 
        size: 10, 
        bold: isCodeCol || col.key === 'stock' || col.key === 'status',
        color: textColor 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      const isNumeric = typeof val === 'number' && !isCodeCol;
      const isCentered = col.key === 'seq' || isCodeCol || col.key === 'unit' || col.key === 'status' || col.key === 'date' || col.key === 'lastDisbursedDate';

      cell.alignment = {
        vertical: 'middle',
        horizontal: isCentered ? 'center' : isNumeric ? 'center' : 'right'
      };
    });

    currentRowIdx++;
  });

  // Apply auto-calculated widths
  columns.forEach((col, idx) => {
    const calculated = Math.min(Math.max(colMaxLens[idx] + 4, col.width || 14), 48);
    worksheet.getColumn(idx + 1).width = calculated;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 250);
}

export async function exportToExcel(
  title: string,
  sheetName: string,
  columns: ExcelColumn[],
  data: any[],
  fileName: string
) {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Stockly WMS';
  workbook.created = new Date();

  const safeName = sanitizeSheetName(sheetName);
  const worksheet = workbook.addWorksheet(safeName);

  buildWorksheet(worksheet, title, columns, data);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Clean filename and ensure single date stamp
  let cleanName = (fileName || 'Report').replace(/\.xlsx$/i, '').trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  if (!cleanName.includes(dateStr)) {
    cleanName = `${cleanName}_${dateStr}`;
  }

  downloadBlob(blob, `${cleanName}.xlsx`);
}

export async function exportMultiSheetExcel(
  sheets: ExcelSheetData[],
  fileName: string
) {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Stockly WMS';
  workbook.created = new Date();

  const usedNames = new Set<string>();

  sheets.forEach((sData, idx) => {
    let safeName = sanitizeSheetName(sData.sheetName);
    if (usedNames.has(safeName)) {
      safeName = `${safeName.slice(0, 27)}_${idx + 1}`;
    }
    usedNames.add(safeName);

    const worksheet = workbook.addWorksheet(safeName);
    buildWorksheet(worksheet, sData.title, sData.columns, sData.data);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  let cleanName = (fileName || 'Full_Inventory_Report').replace(/\.xlsx$/i, '').trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  if (!cleanName.includes(dateStr)) {
    cleanName = `${cleanName}_${dateStr}`;
  }

  downloadBlob(blob, `${cleanName}.xlsx`);
}