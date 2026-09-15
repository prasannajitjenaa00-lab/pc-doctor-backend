const RepairJob = require('../models/RepairJob');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockHistory = require('../models/StockHistory');
const ShopSettings = require('../models/ShopSettings');
const { REPAIR_TEMPLATES, getChecklistForService } = require('../services/repairTemplates');
const { generateRepairTokenPDF, generateRepairInvoicePDF } = require('../services/pdfService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Generate Sequential Unique Ticket Number
 */
const generateTicketNumber = async () => {
  const settings = (await ShopSettings.findOne()) || { repairPrefix: 'REP' };
  const prefix = settings.repairPrefix || 'REP';

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const countToday = await RepairJob.countDocuments({ createdAt: { $gte: startOfDay } });

  const seq = (countToday + 1).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
};

/**
 * Get Available Preset Service Templates
 */
exports.getServiceTemplates = (req, res) => {
  return ApiResponse.success(res, REPAIR_TEMPLATES, 'Repair templates retrieved');
};

/**
 * Create New Repair Job Ticket
 */
exports.createRepairJob = async (req, res, next) => {
  try {
    const {
      customerId,
      customerDetails,
      deviceDetails,
      problemDescription,
      selectedServices = [], // Array of service names e.g. ['Windows Installation', 'Laptop Cleaning']
      technicianNotes = '',
      estimatedCost = 0,
      advancePaid = 0,
      expectedDeliveryDate,
      warrantyDays = 30
    } = req.body;

    if (!customerDetails?.name?.trim() || !customerDetails?.phone?.trim()) {
      return ApiResponse.badRequest(res, 'Customer name and phone number are required');
    }

    const ticketNumber = await generateTicketNumber();

    // 1. Resolve Customer
    let customerDoc = null;
    const custPhone = customerDetails?.phone?.trim();
    const custName = customerDetails?.name?.trim();

    if (customerId) {
      customerDoc = await Customer.findById(customerId);
    } else if (custPhone) {
      customerDoc = await Customer.findOne({ phone: custPhone });
      if (!customerDoc && custName) {
        customerDoc = await Customer.create({
          name: custName,
          phone: custPhone,
          email: customerDetails?.email?.trim() || '',
          address: customerDetails?.address?.trim() || ''
        });
      }
    }

    // 2. Build Services List with Auto Checklists
    const services = (selectedServices || []).map((srv) => {
      const srvName = typeof srv === 'string' ? srv : srv.serviceName;
      const template = REPAIR_TEMPLATES[srvName] || REPAIR_TEMPLATES['Custom Repair'];

      return {
        serviceName: srvName,
        checklist: srv.checklist && srv.checklist.length > 0 ? srv.checklist : getChecklistForService(srvName),
        customNotes: srv.customNotes || '',
        serviceCost: srv.serviceCost !== undefined ? Number(srv.serviceCost) : (template.defaultEstimatedCost || 0)
      };
    });

    // 3. Initial Timeline Entry
    const probText = problemDescription?.trim() ? ` Problem: ${problemDescription.trim()}` : '';
    const timeline = [
      {
        status: 'Received',
        notes: `Device received for repair.${probText}`,
        timestamp: new Date()
      }
    ];

    const initialAdvance = Number(advancePaid) || 0;
    const initialEstimated = Number(estimatedCost) || 0;

    const repairJob = await RepairJob.create({
      ticketNumber,
      customer: customerDoc ? customerDoc._id : null,
      customerDetails: {
        name: customerDoc ? customerDoc.name : custName,
        phone: customerDoc ? customerDoc.phone : custPhone,
        email: customerDoc ? customerDoc.email : (customerDetails?.email || ''),
        address: customerDoc ? customerDoc.address : (customerDetails?.address || '')
      },
      deviceDetails: {
        deviceType: deviceDetails.deviceType || 'Laptop',
        brand: deviceDetails.brand,
        model: deviceDetails.model,
        serialNumber: deviceDetails.serialNumber || '',
        color: deviceDetails.color || '',
        devicePassword: deviceDetails.devicePassword || '',
        accessoriesReceived: deviceDetails.accessoriesReceived || [],
        condition: deviceDetails.condition || {},
        photos: deviceDetails.photos || []
      },
      problemDescription,
      technicianNotes,
      services,
      partsUsed: [],
      status: 'Received',
      timeline,
      financials: {
        labourCharge: initialEstimated,
        partsCost: 0,
        estimatedCost: initialEstimated,
        gstRate: 0,
        gstAmount: 0,
        discount: 0,
        grandTotal: initialEstimated,
        advancePaid: initialAdvance,
        dueAmount: Math.max(0, initialEstimated - initialAdvance),
        paymentMode: 'Cash'
      },
      warrantyDays: Number(warrantyDays) || 30,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      receivedDate: new Date()
    });

    return ApiResponse.created(res, repairJob, 'Repair job intake created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Repair Jobs with Filters and Search
 */
exports.getRepairJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      deviceType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { ticketNumber: regex },
        { 'customerDetails.name': regex },
        { 'customerDetails.phone': regex },
        { 'deviceDetails.brand': regex },
        { 'deviceDetails.model': regex },
        { 'deviceDetails.serialNumber': regex }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (deviceType) {
      query['deviceDetails.deviceType'] = deviceType;
    }

    if (startDate || endDate) {
      query.receivedDate = {};
      if (startDate) query.receivedDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = end;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [repairs, total] = await Promise.all([
      RepairJob.find(query).sort(sortOptions).skip(skip).limit(Number(limit)),
      RepairJob.countDocuments(query)
    ]);

    return ApiResponse.success(res, repairs, 'Repair jobs retrieved', 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Repair Job
 */
exports.getRepairJobById = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id).populate('partsUsed.product', 'name barcode stock');
    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }
    return ApiResponse.success(res, repair);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Repair Status & Append Timeline Note
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, notes = '' } = req.body;
    const repair = await RepairJob.findById(req.params.id);

    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    repair.status = status;
    repair.timeline.push({
      status,
      notes: notes || `Status changed to ${status}`,
      timestamp: new Date()
    });

    if (status === 'Delivered') {
      repair.deliveredDate = new Date();
    }

    await repair.save();
    return ApiResponse.success(res, repair, `Status updated to '${status}'`);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle or Update Checklist Item
 */
exports.updateChecklist = async (req, res, next) => {
  try {
    const { serviceIndex, taskIndex, completed } = req.body;
    const repair = await RepairJob.findById(req.params.id);

    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    if (
      repair.services[serviceIndex] &&
      repair.services[serviceIndex].checklist[taskIndex]
    ) {
      repair.services[serviceIndex].checklist[taskIndex].completed = completed;
      repair.services[serviceIndex].checklist[taskIndex].completedAt = completed ? new Date() : null;
      await repair.save();
      return ApiResponse.success(res, repair, 'Checklist item updated');
    }

    return ApiResponse.badRequest(res, 'Invalid service or task index');
  } catch (error) {
    next(error);
  }
};

/**
 * Add Part Used (Automatically reduce inventory and update cost)
 */
exports.addPartUsed = async (req, res, next) => {
  try {
    const { productId, name, barcode, quantity = 1, unitPrice } = req.body;
    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;

    const repair = await RepairJob.findById(req.params.id);
    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    let unitCost = 0;
    let partName = name;
    let productDoc = null;

    if (productId) {
      productDoc = await Product.findById(productId);
      if (!productDoc) {
        return ApiResponse.notFound(res, 'Inventory product not found');
      }

      if (productDoc.stock < qty) {
        return ApiResponse.badRequest(
          res,
          `Insufficient stock for '${productDoc.name}'. In stock: ${productDoc.stock}, requested: ${qty}`
        );
      }

      unitCost = productDoc.buyPrice || 0;
      partName = productDoc.name;

      // Deduct inventory
      const previousStock = productDoc.stock;
      productDoc.stock = Math.max(0, previousStock - qty);
      await productDoc.save();

      // Log Stock History
      await StockHistory.create({
        product: productDoc._id,
        changeQty: -qty,
        previousStock,
        newStock: productDoc.stock,
        type: 'Repair',
        referenceId: repair.ticketNumber,
        referenceModel: 'RepairJob',
        notes: `Part used in Repair Ticket #${repair.ticketNumber}`
      });
    }

    // Add to partsUsed array
    repair.partsUsed.push({
      product: productId || null,
      name: partName,
      barcode: barcode || productDoc?.barcode || '',
      quantity: qty,
      unitCost,
      unitPrice: price,
      total: qty * price
    });

    // Recalculate totals
    const totalPartsCost = repair.partsUsed.reduce((sum, p) => sum + (p.total || 0), 0);
    repair.financials.partsCost = totalPartsCost;

    const labour = Number(repair.financials.labourCharge) || 0;
    const discount = Number(repair.financials.discount) || 0;
    const gstRate = Number(repair.financials.gstRate) || 0;

    const sub = labour + totalPartsCost;
    const gstAmt = Number(((sub * gstRate) / 100).toFixed(2));
    const grand = Math.max(0, sub + gstAmt - discount);

    repair.financials.gstAmount = gstAmt;
    repair.financials.grandTotal = grand;
    repair.financials.dueAmount = Math.max(0, grand - (repair.financials.advancePaid || 0));

    await repair.save();
    return ApiResponse.success(res, repair, 'Part added and stock deducted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Part Used (Restore Stock)
 */
exports.removePartUsed = async (req, res, next) => {
  try {
    const { partId } = req.params;
    const repair = await RepairJob.findById(req.params.id);

    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    const partIndex = repair.partsUsed.findIndex(p => p._id.toString() === partId);
    if (partIndex === -1) {
      return ApiResponse.notFound(res, 'Part not found on this repair job');
    }

    const [removedPart] = repair.partsUsed.splice(partIndex, 1);

    // Restore stock if it was linked to an inventory product
    if (removedPart.product) {
      const product = await Product.findById(removedPart.product);
      if (product) {
        const previousStock = product.stock;
        product.stock = previousStock + removedPart.quantity;
        await product.save();

        await StockHistory.create({
          product: product._id,
          changeQty: removedPart.quantity,
          previousStock,
          newStock: product.stock,
          type: 'Return',
          referenceId: repair.ticketNumber,
          referenceModel: 'RepairJob',
          notes: `Removed part from Repair Ticket #${repair.ticketNumber}`
        });
      }
    }

    // Recalculate totals
    const totalPartsCost = repair.partsUsed.reduce((sum, p) => sum + (p.total || 0), 0);
    repair.financials.partsCost = totalPartsCost;

    const labour = Number(repair.financials.labourCharge) || 0;
    const discount = Number(repair.financials.discount) || 0;
    const gstRate = Number(repair.financials.gstRate) || 0;

    const sub = labour + totalPartsCost;
    const gstAmt = Number(((sub * gstRate) / 100).toFixed(2));
    const grand = Math.max(0, sub + gstAmt - discount);

    repair.financials.gstAmount = gstAmt;
    repair.financials.grandTotal = grand;
    repair.financials.dueAmount = Math.max(0, grand - (repair.financials.advancePaid || 0));

    await repair.save();
    return ApiResponse.success(res, repair, 'Part removed and stock restored successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Repair Financials / Settle Payment
 */
exports.updateFinancials = async (req, res, next) => {
  try {
    const {
      labourCharge,
      partsCost,
      gstRate = 0,
      discount = 0,
      advancePaid = 0,
      paymentMode = 'Cash'
    } = req.body;

    const repair = await RepairJob.findById(req.params.id);
    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    const labour = labourCharge !== undefined ? Number(labourCharge) : (repair.financials.labourCharge || 0);
    const parts = partsCost !== undefined ? Number(partsCost) : (repair.financials.partsCost || 0);
    const disc = discount !== undefined ? Number(discount) : (repair.financials.discount || 0);
    const gst = gstRate !== undefined ? Number(gstRate) : (repair.financials.gstRate || 0);
    const advance = advancePaid !== undefined ? Number(advancePaid) : (repair.financials.advancePaid || 0);

    const sub = labour + parts;
    const gstAmt = Number(((sub * gst) / 100).toFixed(2));
    const grandTotal = Math.max(0, Number((sub + gstAmt - disc).toFixed(2)));
    const dueAmount = Math.max(0, Number((grandTotal - advance).toFixed(2)));

    repair.financials = {
      ...repair.financials,
      labourCharge: labour,
      partsCost: parts,
      gstRate: gst,
      gstAmount: gstAmt,
      discount: disc,
      grandTotal,
      advancePaid: advance,
      dueAmount,
      paymentMode
    };

    await repair.save();
    return ApiResponse.success(res, repair, 'Financials updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Download Repair Intake Token PDF
 */
exports.downloadTokenPDF = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id);
    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    const shopSettings = (await ShopSettings.findOne()) || {};
    const pdfBuffer = await generateRepairTokenPDF(repair, shopSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="RepairToken-${repair.ticketNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Download Final Repair Tax Invoice PDF
 */
exports.downloadInvoicePDF = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id);
    if (!repair) {
      return ApiResponse.notFound(res, 'Repair job not found');
    }

    const shopSettings = (await ShopSettings.findOne()) || {};
    const pdfBuffer = await generateRepairInvoicePDF(repair, shopSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="RepairInvoice-${repair.ticketNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
