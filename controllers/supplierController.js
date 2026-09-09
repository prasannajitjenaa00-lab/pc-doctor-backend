const Supplier = require('../models/Supplier');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get all suppliers with search
 */
exports.getSuppliers = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { company: regex }, { phone: regex }];
    }

    const suppliers = await Supplier.find(query).sort({ company: 1 });
    return ApiResponse.success(res, suppliers, 'Suppliers retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Supplier
 */
exports.getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return ApiResponse.notFound(res, 'Supplier not found');
    }
    return ApiResponse.success(res, supplier);
  } catch (error) {
    next(error);
  }
};

/**
 * Create Supplier
 */
exports.createSupplier = async (req, res, next) => {
  try {
    const { name, company, phone, email, address, gstNumber, notes } = req.body;

    const supplier = await Supplier.create({
      name: name.trim(),
      company: company.trim(),
      phone: phone.trim(),
      email: email?.trim().toLowerCase() || '',
      address: address?.trim() || '',
      gstNumber: gstNumber?.trim() || '',
      notes: notes?.trim() || ''
    });

    return ApiResponse.created(res, supplier, 'Supplier created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Supplier
 */
exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return ApiResponse.notFound(res, 'Supplier not found');
    }

    const { name, company, phone, email, address, gstNumber, notes } = req.body;

    if (name) supplier.name = name.trim();
    if (company) supplier.company = company.trim();
    if (phone) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email.trim().toLowerCase();
    if (address !== undefined) supplier.address = address.trim();
    if (gstNumber !== undefined) supplier.gstNumber = gstNumber.trim();
    if (notes !== undefined) supplier.notes = notes.trim();

    await supplier.save();
    return ApiResponse.success(res, supplier, 'Supplier updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Supplier
 */
exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return ApiResponse.notFound(res, 'Supplier not found');
    }

    await Supplier.findByIdAndDelete(req.params.id);
    return ApiResponse.success(res, null, 'Supplier deleted successfully');
  } catch (error) {
    next(error);
  }
};
