const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const RepairJob = require('../models/RepairJob');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get all customers with search and pagination
 */
exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;

    const query = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sortOptions).skip(skip).limit(Number(limit)),
      Customer.countDocuments(query)
    ]);

    return ApiResponse.success(res, customers, 'Customers retrieved', 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Customer with Complete Ledger (Purchases & Repairs)
 */
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, 'Customer not found');
    }

    // Fetch past bills
    const bills = await Bill.find({
      $or: [{ customer: customer._id }, { 'customerSnapshot.phone': customer.phone }]
    }).sort({ createdAt: -1 });

    // Fetch past repair jobs
    const repairs = await RepairJob.find({
      $or: [{ customer: customer._id }, { 'customerDetails.phone': customer.phone }]
    }).sort({ createdAt: -1 });

    return ApiResponse.success(res, {
      customer,
      purchaseHistory: bills,
      repairHistory: repairs
    }, 'Customer profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create Customer
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, gstNumber, notes } = req.body;

    const existing = await Customer.findOne({ phone: phone.trim() });
    if (existing) {
      return ApiResponse.badRequest(res, `Customer with phone number '${phone}' already exists`);
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim().toLowerCase() || '',
      address: address?.trim() || '',
      gstNumber: gstNumber?.trim() || '',
      notes: notes?.trim() || ''
    });

    return ApiResponse.created(res, customer, 'Customer created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Customer
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, 'Customer not found');
    }

    const { name, phone, email, address, gstNumber, notes } = req.body;

    if (name) customer.name = name.trim();
    if (phone) customer.phone = phone.trim();
    if (email !== undefined) customer.email = email.trim().toLowerCase();
    if (address !== undefined) customer.address = address.trim();
    if (gstNumber !== undefined) customer.gstNumber = gstNumber.trim();
    if (notes !== undefined) customer.notes = notes.trim();

    await customer.save();
    return ApiResponse.success(res, customer, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Settle or Reduce Customer Outstanding Due
 */
exports.settleDue = async (req, res, next) => {
  try {
    const { amountPaid, notes } = req.body;
    const payment = Number(amountPaid);

    if (isNaN(payment) || payment <= 0) {
      return ApiResponse.badRequest(res, 'Valid payment amount is required');
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, 'Customer not found');
    }

    customer.outstandingDue = Math.max(0, (customer.outstandingDue || 0) - payment);
    await customer.save();

    return ApiResponse.success(res, customer, `Payment of ${payment} applied. Remaining due: ${customer.outstandingDue}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Customer
 */
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return ApiResponse.notFound(res, 'Customer not found');
    }

    await Customer.findByIdAndDelete(req.params.id);
    return ApiResponse.success(res, null, 'Customer deleted successfully');
  } catch (error) {
    next(error);
  }
};
