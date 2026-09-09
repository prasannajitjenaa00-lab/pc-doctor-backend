const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get all categories with attached product count
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();

    // Get count of active products for each category
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const countMap = counts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const enriched = categories.map(cat => ({
      ...cat,
      productCount: countMap[cat._id.toString()] || 0
    }));

    return ApiResponse.success(res, enriched, 'Categories retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return ApiResponse.badRequest(res, `Category '${name}' already exists`);
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3b82f6'
    });

    return ApiResponse.created(res, category, 'Category created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (color) category.color = color;

    await category.save();
    return ApiResponse.success(res, category, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    // Check if products exist in this category
    const productsUsing = await Product.countDocuments({ category: req.params.id, isActive: true });
    if (productsUsing > 0) {
      return ApiResponse.badRequest(
        res,
        `Cannot delete category. There are ${productsUsing} active products assigned to it. Please reassign them first.`
      );
    }

    await Category.findByIdAndDelete(req.params.id);
    return ApiResponse.success(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};
