const PDFDocument = require('pdfkit');

/**
 * Generate Professional Sales Tax Invoice PDF
 */
const generateBillInvoicePDF = (bill, shopSettings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const shopName = shopSettings.shopName || 'PC DOCTOR';
      const tagline = shopSettings.tagline || 'Billing, Inventory & Repair Management';
      const address = shopSettings.address || 'Commercial Hub, City';
      const phone = shopSettings.phone || '+91 98765 43210';
      const gst = shopSettings.gstNumber ? `GSTIN: ${shopSettings.gstNumber}` : '';
      const currency = shopSettings.currencySymbol || '₹';

      // Header Banner
      doc.rect(40, 40, 515, 65).fill('#1e3a8a'); // Primary Dark Blue
      doc.fillColor('#ffffff').fontSize(20).text(shopName.toUpperCase(), 55, 50, { bold: true });
      doc.fontSize(9).fillColor('#bfdbfe').text(tagline, 55, 75);
      doc.fontSize(8).fillColor('#e0e7ff').text(`${address} | Phone: ${phone} ${gst ? ' | ' + gst : ''}`, 55, 88);

      // Invoice Details Block
      doc.fillColor('#111827').fontSize(12).text('TAX INVOICE', 40, 120, { bold: true });

      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Invoice No: ${bill.invoiceNumber}`, 40, 138);
      doc.text(`Date: ${new Date(bill.date || bill.createdAt).toLocaleDateString()} ${new Date(bill.date || bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 40, 152);
      doc.text(`Payment Mode: ${bill.paymentMode || 'Cash'}`, 40, 166);

      // Billed To Block
      doc.fontSize(10).fillColor('#111827').text('Billed To:', 340, 120, { bold: true });
      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Name: ${bill.customerSnapshot?.name || 'Walk-in Customer'}`, 340, 138);
      if (bill.customerSnapshot?.phone) doc.text(`Phone: ${bill.customerSnapshot.phone}`, 340, 152);
      if (bill.customerSnapshot?.address) doc.text(`Address: ${bill.customerSnapshot.address}`, 340, 166);
      if (bill.customerSnapshot?.gstNumber) doc.text(`Customer GST: ${bill.customerSnapshot.gstNumber}`, 340, 180);

      // Divider
      doc.moveTo(40, 200).lineTo(555, 200).strokeColor('#e5e7eb').stroke();

      // Table Header
      let y = 210;
      doc.rect(40, y, 515, 22).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8);
      doc.text('#', 45, y + 6, { bold: true });
      doc.text('Item Description', 65, y + 6, { width: 230, bold: true });
      doc.text('Qty', 300, y + 6, { width: 40, align: 'center', bold: true });
      doc.text(`Rate (${currency})`, 345, y + 6, { width: 65, align: 'right', bold: true });
      doc.text('GST %', 415, y + 6, { width: 45, align: 'center', bold: true });
      doc.text(`Total (${currency})`, 465, y + 6, { width: 85, align: 'right', bold: true });

      y += 28;

      // Table Rows
      doc.fillColor('#1f2937').fontSize(8.5);
      (bill.items || []).forEach((item, index) => {
        doc.text((index + 1).toString(), 45, y);
        doc.text(item.name || 'Item', 65, y, { width: 230 });
        doc.text(item.qty.toString(), 300, y, { width: 40, align: 'center' });
        doc.text(Number(item.unitPrice).toFixed(2), 345, y, { width: 65, align: 'right' });
        doc.text(`${item.gstRate || 0}%`, 415, y, { width: 45, align: 'center' });
        doc.text(Number(item.total).toFixed(2), 465, y, { width: 85, align: 'right' });

        y += 20;
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });

      // Divider
      doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor('#e5e7eb').stroke();
      y += 15;

      // Totals Summary Box
      const summaryStartX = 340;
      doc.fontSize(9).fillColor('#374151');
      doc.text('Subtotal:', summaryStartX, y);
      doc.text(`${currency} ${Number(bill.subTotal || 0).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
      y += 16;

      if (bill.discountAmount > 0) {
        doc.text('Discount:', summaryStartX, y);
        doc.text(`- ${currency} ${Number(bill.discountAmount).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
        y += 16;
      }

      if (bill.taxAmount > 0) {
        doc.text('GST / Tax Total:', summaryStartX, y);
        doc.text(`${currency} ${Number(bill.taxAmount).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
        y += 16;
      }

      // Grand Total Highlight
      doc.rect(summaryStartX - 10, y, 225, 24).fill('#eff6ff');
      doc.fillColor('#1e40af').fontSize(11).text('Grand Total:', summaryStartX, y + 6, { bold: true });
      doc.text(`${currency} ${Number(bill.grandTotal || 0).toFixed(2)}`, 465, y + 6, { width: 85, align: 'right', bold: true });
      y += 35;

      // Payment Breakdown
      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Paid Amount: ${currency} ${Number(bill.paidAmount || bill.grandTotal).toFixed(2)}`, summaryStartX, y);
      y += 16;
      if (bill.dueAmount > 0) {
        doc.fillColor('#dc2626').text(`Due Balance: ${currency} ${Number(bill.dueAmount).toFixed(2)}`, summaryStartX, y, { bold: true });
        y += 20;
      }

      // Footer Notes & Terms
      doc.fillColor('#6b7280').fontSize(8);
      const footerText = shopSettings.invoiceFooter || 'Thank you for your business!';
      doc.text(footerText, 40, 720, { width: 515, align: 'center' });
      doc.text('Computer Generated Invoice - No signature required', 40, 735, { width: 515, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Repair Job Token / Receipt PDF
 */
const generateRepairTokenPDF = (repair, shopSettings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const shopName = shopSettings.shopName || 'PC DOCTOR';
      const phone = shopSettings.phone || '+91 98765 43210';
      const currency = shopSettings.currencySymbol || '₹';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill('#0f766e'); // Teal Primary for Repair Job Sheet
      doc.fillColor('#ffffff').fontSize(18).text(shopName.toUpperCase(), 55, 50, { bold: true });
      doc.fontSize(9).fillColor('#ccfbf1').text('REPAIR JOB INTAKE SHEET / TOKEN', 55, 73);
      doc.fontSize(8).text(`Helpline: ${phone}`, 400, 55, { align: 'right' });

      // Ticket & Customer Info
      let y = 115;
      doc.rect(40, y, 515, 60).strokeColor('#e5e7eb').stroke();
      doc.fillColor('#111827').fontSize(10).text(`TICKET NO: ${repair.ticketNumber}`, 50, y + 10, { bold: true });
      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Received Date: ${new Date(repair.receivedDate || repair.createdAt).toLocaleDateString()}`, 50, y + 26);
      doc.text(`Expected Delivery: ${repair.expectedDeliveryDate ? new Date(repair.expectedDeliveryDate).toLocaleDateString() : 'TBD'}`, 50, y + 40);

      doc.fontSize(10).fillColor('#111827').text('CUSTOMER INFO', 300, y + 10, { bold: true });
      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Name: ${repair.customerDetails.name}`, 300, y + 26);
      doc.text(`Phone: ${repair.customerDetails.phone}`, 300, y + 40);

      // Device Details Block
      y += 75;
      doc.rect(40, y, 515, 75).strokeColor('#e5e7eb').stroke();
      doc.fontSize(10).fillColor('#0f766e').text('DEVICE SPECIFICATIONS', 50, y + 10, { bold: true });
      doc.fontSize(9).fillColor('#374151');
      doc.text(`Type: ${repair.deviceDetails.deviceType}`, 50, y + 28);
      doc.text(`Brand & Model: ${repair.deviceDetails.brand} ${repair.deviceDetails.model}`, 50, y + 42);
      doc.text(`Serial / IMEI: ${repair.deviceDetails.serialNumber || 'N/A'}`, 50, y + 56);

      doc.text(`Accessories: ${repair.deviceDetails.accessoriesReceived?.join(', ') || 'Unit only'}`, 280, y + 28);
      doc.text(`Lock / Password: ${repair.deviceDetails.devicePassword || 'None'}`, 280, y + 42);
      doc.text(`Color: ${repair.deviceDetails.color || 'Standard'}`, 280, y + 56);

      // Problem Description
      y += 90;
      doc.rect(40, y, 515, 55).strokeColor('#e5e7eb').stroke();
      doc.fontSize(10).fillColor('#b91c1c').text('REPORTED PROBLEM', 50, y + 8, { bold: true });
      doc.fontSize(9).fillColor('#1f2937').text(repair.problemDescription, 50, y + 24, { width: 495 });

      // Physical Condition Checklist Matrix
      y += 70;
      doc.rect(40, y, 515, 95).strokeColor('#e5e7eb').stroke();
      doc.fontSize(10).fillColor('#374151').text('PHYSICAL INSPECTION MATRIX (AT RECEIVING)', 50, y + 8, { bold: true });

      const cond = repair.deviceDetails.condition || {};
      const checks = [
        ['Screen', cond.screen || 'Good'],
        ['Body / Casing', cond.body || 'Good'],
        ['Keyboard', cond.keyboard || 'Working'],
        ['Battery', cond.battery || 'Working'],
        ['Camera', cond.camera || 'Working'],
        ['Speakers', cond.speakers || 'Working'],
        ['USB Ports', cond.usbPorts || 'Working'],
        ['HDMI / Display', cond.hdmi || 'Working'],
        ['Wi-Fi / BT', cond.wifi || 'Working'],
        ['Power Button', cond.powerButton || 'Working'],
        ['Touchpad', cond.touchpad || 'Working']
      ];

      doc.fontSize(8).fillColor('#4b5563');
      let colX = 50;
      let rowY = y + 26;
      checks.forEach(([name, status], idx) => {
        doc.text(`${name}: ${status}`, colX, rowY);
        rowY += 15;
        if ((idx + 1) % 4 === 0) {
          colX += 160;
          rowY = y + 26;
        }
      });

      // Estimates & Financials
      y += 110;
      doc.rect(40, y, 515, 45).fill('#f0fdfa');
      doc.fillColor('#0f766e').fontSize(10).text('ESTIMATE & ADVANCE DETAILS', 50, y + 8, { bold: true });
      doc.fontSize(9).fillColor('#134e4a');
      doc.text(`Estimated Cost: ${currency} ${Number(repair.financials?.estimatedCost || 0).toFixed(2)}`, 50, y + 25);
      doc.text(`Advance Paid: ${currency} ${Number(repair.financials?.advancePaid || 0).toFixed(2)}`, 220, y + 25);
      doc.text(`Current Status: ${repair.status}`, 390, y + 25, { bold: true });

      // Signatures Block
      y += 75;
      doc.fontSize(9).fillColor('#374151');
      doc.text('Customer Signature', 50, y);
      doc.moveTo(50, y - 5).lineTo(180, y - 5).strokeColor('#9ca3af').stroke();

      doc.text('Technician Signature', 390, y);
      doc.moveTo(390, y - 5).lineTo(520, y - 5).strokeColor('#9ca3af').stroke();

      // Terms
      y += 25;
      doc.fontSize(7.5).fillColor('#6b7280');
      doc.text(
        shopSettings.termsAndConditions ||
        'Please retain this ticket to claim your device. Unclaimed devices after 30 days are subject to disposal charges.',
        40,
        y,
        { width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Final Repair Invoice PDF (after completion)
 */
const generateRepairInvoicePDF = (repair, shopSettings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const shopName = shopSettings.shopName || 'PC DOCTOR';
      const currency = shopSettings.currencySymbol || '₹';
      const address = shopSettings.address || 'Commercial Hub, City';
      const phone = shopSettings.phone || '+91 98765 43210';
      const gst = shopSettings.gstNumber ? `GSTIN: ${shopSettings.gstNumber}` : '';

      // Header Banner
      doc.rect(40, 40, 515, 65).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(18).text(shopName.toUpperCase(), 55, 50, { bold: true });
      doc.fontSize(9).fillColor('#bfdbfe').text('FINAL REPAIR & SERVICE INVOICE', 55, 75);
      doc.fontSize(8).fillColor('#e0e7ff').text(`${address} | Phone: ${phone} ${gst ? ' | ' + gst : ''}`, 55, 88);

      // Meta Details
      doc.fillColor('#111827').fontSize(10).text(`Invoice No: REP-INV-${repair.ticketNumber}`, 40, 120, { bold: true });
      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Job Ticket: ${repair.ticketNumber}`, 40, 136);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 150);
      doc.text(`Warranty: ${repair.warrantyDays || 30} Days on Replaced Parts`, 40, 164);

      // Customer & Device Info
      doc.fontSize(10).fillColor('#111827').text('Customer & Device Details', 320, 120, { bold: true });
      doc.fontSize(9).fillColor('#4b5563');
      doc.text(`Name: ${repair.customerDetails.name}`, 320, 136);
      doc.text(`Phone: ${repair.customerDetails.phone}`, 320, 150);
      doc.text(`Device: ${repair.deviceDetails.brand} ${repair.deviceDetails.model} (${repair.deviceDetails.deviceType})`, 320, 164);

      // Divider
      doc.moveTo(40, 185).lineTo(555, 185).strokeColor('#e5e7eb').stroke();

      // Services Performed Table
      let y = 195;
      doc.rect(40, y, 515, 20).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8.5).text('Services & Work Completed', 45, y + 5, { bold: true });
      doc.text(`Cost (${currency})`, 465, y + 5, { width: 85, align: 'right', bold: true });

      y += 25;
      (repair.services || []).forEach((srv) => {
        doc.fillColor('#1f2937').fontSize(8.5).text(`• ${srv.serviceName}`, 50, y);
        doc.text(Number(srv.serviceCost || 0).toFixed(2), 465, y, { width: 85, align: 'right' });
        y += 18;
      });

      // Parts Used Table
      if (repair.partsUsed && repair.partsUsed.length > 0) {
        y += 10;
        doc.rect(40, y, 515, 20).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(8.5).text('Parts & Hardware Installed', 45, y + 5, { bold: true });
        doc.text('Qty', 350, y + 5, { width: 40, align: 'center', bold: true });
        doc.text(`Total (${currency})`, 465, y + 5, { width: 85, align: 'right', bold: true });

        y += 25;
        repair.partsUsed.forEach((part) => {
          doc.fillColor('#1f2937').fontSize(8.5).text(`• ${part.name}`, 50, y);
          doc.text(part.quantity.toString(), 350, y, { width: 40, align: 'center' });
          doc.text(Number(part.total).toFixed(2), 465, y, { width: 85, align: 'right' });
          y += 18;
        });
      }

      // Financials Summary
      y += 15;
      const startX = 330;
      const fin = repair.financials || {};
      doc.fillColor('#374151').fontSize(9);
      doc.text('Labour / Service Charge:', startX, y);
      doc.text(`${currency} ${Number(fin.labourCharge || 0).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
      y += 16;

      doc.text('Hardware Parts Cost:', startX, y);
      doc.text(`${currency} ${Number(fin.partsCost || 0).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
      y += 16;

      if (fin.discount > 0) {
        doc.text('Discount:', startX, y);
        doc.text(`- ${currency} ${Number(fin.discount).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
        y += 16;
      }

      if (fin.gstAmount > 0) {
        doc.text(`GST (${fin.gstRate || 18}%):`, startX, y);
        doc.text(`${currency} ${Number(fin.gstAmount).toFixed(2)}`, 465, y, { width: 85, align: 'right' });
        y += 16;
      }

      // Grand Total Box
      doc.rect(startX - 10, y, 235, 24).fill('#eff6ff');
      doc.fillColor('#1e40af').fontSize(11).text('Grand Total:', startX, y + 6, { bold: true });
      doc.text(`${currency} ${Number(fin.grandTotal || 0).toFixed(2)}`, 465, y + 6, { width: 85, align: 'right', bold: true });
      y += 32;

      doc.fontSize(9).fillColor('#15803d');
      doc.text(`Advance Paid: ${currency} ${Number(fin.advancePaid || 0).toFixed(2)}`, startX, y);
      y += 16;

      if (fin.dueAmount > 0) {
        doc.fillColor('#dc2626').text(`Balance Due: ${currency} ${Number(fin.dueAmount).toFixed(2)}`, startX, y, { bold: true });
      } else {
        doc.fillColor('#15803d').text('Balance Due: PAID IN FULL', startX, y, { bold: true });
      }

      // Signatures
      y = 690;
      doc.fontSize(8.5).fillColor('#374151');
      doc.text('Customer Acceptance Signature', 50, y);
      doc.moveTo(50, y - 5).lineTo(200, y - 5).strokeColor('#9ca3af').stroke();

      doc.text('Authorized Store Signature', 370, y);
      doc.moveTo(370, y - 5).lineTo(520, y - 5).strokeColor('#9ca3af').stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateBillInvoicePDF,
  generateRepairTokenPDF,
  generateRepairInvoicePDF
};
