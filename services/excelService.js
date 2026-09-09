const ExcelJS = require('exceljs');

/**
 * Generate Inventory Stock Excel Workbook
 */
const generateInventoryExcel = async (products = []) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PC Doctor System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Inventory Products', {
    properties: { tabColor: { argb: '3b82f6' } }
  });

  worksheet.columns = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Product Name', key: 'name', width: 35 },
    { header: 'Barcode', key: 'barcode', width: 18 },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Buy Price (₹)', key: 'buyPrice', width: 15 },
    { header: 'Selling Price (₹)', key: 'sellingPrice', width: 16 },
    { header: 'Profit/Unit (₹)', key: 'profit', width: 15 },
    { header: 'Margin %', key: 'margin', width: 12 },
    { header: 'Current Stock', key: 'stock', width: 14 },
    { header: 'Min Stock', key: 'minStock', width: 12 },
    { header: 'Stock Status', key: 'status', width: 15 }
  ];

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  products.forEach((p, idx) => {
    const profit = (p.sellingPrice || 0) - (p.buyPrice || 0);
    const margin = p.sellingPrice ? ((profit / p.sellingPrice) * 100).toFixed(1) : '0';
    const isLow = (p.stock || 0) <= (p.minStock || 5);

    const row = worksheet.addRow({
      index: idx + 1,
      name: p.name,
      barcode: p.barcode || 'N/A',
      sku: p.sku || 'N/A',
      category: p.category?.name || 'Uncategorized',
      buyPrice: p.buyPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      profit: profit,
      margin: `${margin}%`,
      stock: p.stock || 0,
      minStock: p.minStock || 0,
      status: isLow ? 'LOW STOCK' : 'IN STOCK'
    });

    if (isLow) {
      row.getCell('status').font = { color: { argb: 'DC2626' }, bold: true };
    } else {
      row.getCell('status').font = { color: { argb: '16A34A' } };
    }
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Generate Sales Report Excel Workbook
 */
const generateSalesReportExcel = async (bills = [], summary = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Bills', {
    properties: { tabColor: { argb: '10B981' } }
  });

  worksheet.columns = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Items Count', key: 'itemsCount', width: 12 },
    { header: 'Subtotal (₹)', key: 'subTotal', width: 14 },
    { header: 'Tax / GST (₹)', key: 'taxAmount', width: 14 },
    { header: 'Discount (₹)', key: 'discountAmount', width: 14 },
    { header: 'Grand Total (₹)', key: 'grandTotal', width: 16 },
    { header: 'Profit (₹)', key: 'profit', width: 14 },
    { header: 'Payment Mode', key: 'paymentMode', width: 15 },
    { header: 'Status', key: 'status', width: 12 }
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '065F46' }
  };
  headerRow.height = 28;

  bills.forEach((b, idx) => {
    worksheet.addRow({
      index: idx + 1,
      invoiceNumber: b.invoiceNumber,
      date: new Date(b.date || b.createdAt).toLocaleDateString(),
      customer: b.customerSnapshot?.name || 'Walk-in',
      phone: b.customerSnapshot?.phone || '-',
      itemsCount: b.items ? b.items.length : 0,
      subTotal: b.subTotal || 0,
      taxAmount: b.taxAmount || 0,
      discountAmount: b.discountAmount || 0,
      grandTotal: b.grandTotal || 0,
      profit: b.profit || 0,
      paymentMode: b.paymentMode || 'Cash',
      status: b.status || 'Paid'
    });
  });

  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  generateInventoryExcel,
  generateSalesReportExcel
};
