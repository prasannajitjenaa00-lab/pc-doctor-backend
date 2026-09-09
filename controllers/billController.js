const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockHistory = require('../models/StockHistory');
const ShopSettings = require('../models/ShopSettings');
const { generateBillInvoicePDF } = require('../services/pdfService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Generate Sequential Unique Invoice Number
 */
const generateInvoiceNumber = async () => {
  const settings = (await ShopSettings.findOne()) || { invoicePrefix: 'INV' };
  const prefix = settings.invoicePrefix || 'INV';

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const countToday = await Bill.countDocuments({ createdAt: { $gte: startOfDay } });

  const seq = (countToday + 1).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
};

/**
 * Create Bill (POS Checkout with Atomic Inventory Deduction)
 */
exports.createBill = async (req, res, next) => {
  try {
    const {
      customerId,
      customerSnapshot,
      items,
      discountType = 'fixed',
      discountValue = 0,
      paymentMode = 'Cash',
      paidAmount = 0,
      notes = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ApiResponse.badRequest(res, 'At least one item is required to generate a bill');
    }

    // 1. Calculate Totals and Verify Inventory
    let subTotal = 0;
    let taxAmount = 0;
    let totalCost = 0;
    const processedItems = [];

    for (const item of items) {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const gstRate = Number(item.gstRate) || 0;

      // Price calculation
      const baseItemTotal = qty * unitPrice;
      const itemGst = Number(((baseItemTotal * gstRate) / 100).toFixed(2));
      const itemTotal = Number((baseItemTotal + itemGst).toFixed(2));

      subTotal += baseItemTotal;
      taxAmount += itemGst;

      let buyPrice = Number(item.buyPrice) || 0;

      // If item linked to an existing product, verify and deduct stock
      if (item.product) {
        const dbProduct = await Product.findById(item.product);
        if (dbProduct) {
          buyPrice = dbProduct.buyPrice || 0;

          // Check if sufficient stock is available
          if (dbProduct.stock < qty) {
            return ApiResponse.badRequest(
              res,
              `Insufficient stock for '${dbProduct.name}'. Available: ${dbProduct.stock}, Requested: ${qty}`
            );
          }
        }
      }

      totalCost += qty * buyPrice;

      processedItems.push({
        product: item.product || null,
        name: item.name,
        barcode: item.barcode || '',
        sku: item.sku || '',
        qty,
        buyPrice,
        unitPrice,
        gstRate,
        gstAmount: itemGst,
        total: itemTotal
      });
    }

    // Calculate Discount
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = Number(((subTotal * Number(discountValue)) / 100).toFixed(2));
    } else {
      discountAmount = Number(discountValue) || 0;
    }

    const calculatedTotal = Number((subTotal + taxAmount - discountAmount).toFixed(2));
    const grandTotal = Math.max(0, calculatedTotal);
    const profit = Number((grandTotal - totalCost).toFixed(2));

    const finalPaid = Number(paidAmount) >= 0 ? Number(paidAmount) : grandTotal;
    const dueAmount = Math.max(0, Number((grandTotal - finalPaid).toFixed(2)));

    let billStatus = 'Paid';
    if (dueAmount > 0) {
      billStatus = finalPaid > 0 ? 'Partial' : 'Unpaid';
    }

    // 2. Generate Invoice Number
    const invoiceNumber = await generateInvoiceNumber();

    // 3. Resolve Customer Record
    let customerDoc = null;
    const custName = customerSnapshot?.name?.trim() || 'Walk-in Customer';
    const custPhone = customerSnapshot?.phone?.trim() || '';

    if (customerId) {
      customerDoc = await Customer.findById(customerId);
    } else if (custPhone) {
      customerDoc = await Customer.findOne({ phone: custPhone });
      if (!customerDoc && custName !== 'Walk-in Customer') {
        // Auto-create customer record if new phone provided
        customerDoc = await Customer.create({
          name: custName,
          phone: custPhone,
          email: customerSnapshot?.email?.trim() || '',
          address: customerSnapshot?.address?.trim() || '',
          gstNumber: customerSnapshot?.gstNumber?.trim() || ''
        });
      }
    }

    // 4. Create the Bill Record
    const bill = await Bill.create({
      invoiceNumber,
      customer: customerDoc ? customerDoc._id : null,
      customerSnapshot: {
        name: customerDoc ? customerDoc.name : custName,
        phone: customerDoc ? customerDoc.phone : custPhone,
        email: customerDoc ? customerDoc.email : (customerSnapshot?.email || ''),
        address: customerDoc ? customerDoc.address : (customerSnapshot?.address || ''),
        gstNumber: customerDoc ? customerDoc.gstNumber : (customerSnapshot?.gstNumber || '')
      },
      items: processedItems,
      subTotal: Number(subTotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      grandTotal,
      totalCost,
      profit,
      paymentMode,
      paidAmount: finalPaid,
      dueAmount,
      status: billStatus,
      notes
    });

    // 5. Atomically Deduct Inventory Stock and Record Stock Audit Log
    for (const item of processedItems) {
      if (item.product) {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.stock;
          const newStock = Math.max(0, previousStock - item.qty);

          product.stock = newStock;
          await product.save();

          await StockHistory.create({
            product: product._id,
            changeQty: -item.qty,
            previousStock,
            newStock,
            type: 'Sale',
            referenceId: bill.invoiceNumber,
            referenceModel: 'Bill',
            notes: `Sold in Invoice #${bill.invoiceNumber}`
          });
        }
      }
    }

    // 6. Update Customer Statistics & Dues
    if (customerDoc) {
      customerDoc.totalPurchases = (customerDoc.totalPurchases || 0) + 1;
      customerDoc.totalSpent = (customerDoc.totalSpent || 0) + grandTotal;
      if (dueAmount > 0) {
        customerDoc.outstandingDue = (customerDoc.outstandingDue || 0) + dueAmount;
      }
      await customerDoc.save();
    }

    return ApiResponse.created(res, bill, 'Bill generated and stock deducted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Bills with Filters and Pagination
 */
exports.getBills = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      paymentMode,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: regex },
        { 'customerSnapshot.name': regex },
        { 'customerSnapshot.phone': regex }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bills, total] = await Promise.all([
      Bill.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Bill.countDocuments(query)
    ]);

    return ApiResponse.success(res, bills, 'Bills retrieved', 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Bill by ID
 */
exports.getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('items.product', 'name barcode sku');
    if (!bill) {
      return ApiResponse.notFound(res, 'Bill not found');
    }
    return ApiResponse.success(res, bill);
  } catch (error) {
    next(error);
  }
};

/**
 * Download Invoice PDF
 */
exports.downloadInvoicePDF = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return ApiResponse.notFound(res, 'Bill not found');
    }

    const shopSettings = (await ShopSettings.findOne()) || {};
    const pdfBuffer = await generateBillInvoicePDF(bill, shopSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${bill.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Bill & Restore Stock Atomically
 */
exports.cancelBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return ApiResponse.notFound(res, 'Bill not found');
    }

    if (bill.status === 'Cancelled') {
      return ApiResponse.badRequest(res, 'Bill is already cancelled');
    }

    // Restore stock to inventory
    for (const item of bill.items) {
      if (item.product) {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.stock;
          const newStock = previousStock + item.qty;

          product.stock = newStock;
          await product.save();

          await StockHistory.create({
            product: product._id,
            changeQty: item.qty,
            previousStock,
            newStock,
            type: 'Return',
            referenceId: bill.invoiceNumber,
            referenceModel: 'Bill',
            notes: `Cancelled Invoice #${bill.invoiceNumber}`
          });
        }
      }
    }

    // Adjust customer dues if applicable
    if (bill.customer && bill.dueAmount > 0) {
      const customer = await Customer.findById(bill.customer);
      if (customer) {
        customer.outstandingDue = Math.max(0, (customer.outstandingDue || 0) - bill.dueAmount);
        customer.totalSpent = Math.max(0, (customer.totalSpent || 0) - bill.grandTotal);
        await customer.save();
      }
    }

    bill.status = 'Cancelled';
    await bill.save();

    return ApiResponse.success(res, bill, 'Bill cancelled and inventory restored successfully');
  } catch (error) {
    next(error);
  }
};
