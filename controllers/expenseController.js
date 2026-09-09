const Expense = require('../models/Expense');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get Expenses with Category & Date Range Filter
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category) {
      query.category = category;
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

    const [expenses, total, summary] = await Promise.all([
      Expense.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
      ])
    ]);

    return ApiResponse.success(res, expenses, 'Expenses retrieved', 200, {
      total,
      totalSpent: summary[0]?.totalSpent || 0,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Expense Category Analytics
 */
exports.getExpenseAnalytics = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const now = new Date();
    const targetYear = year ? Number(year) : now.getFullYear();
    const targetMonth = month ? Number(month) - 1 : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const breakdown = await Expense.aggregate([
      { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalMonthExpense = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);

    return ApiResponse.success(res, {
      breakdown,
      totalMonthExpense,
      period: `${targetMonth + 1}/${targetYear}`
    }, 'Expense analytics fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * Create Expense
 */
exports.createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, date, paymentMode, notes, receiptImage } = req.body;

    const expense = await Expense.create({
      title: title.trim(),
      category,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      paymentMode: paymentMode || 'Cash',
      notes: notes || '',
      receiptImage: receiptImage || ''
    });

    return ApiResponse.created(res, expense, 'Expense recorded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Expense
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return ApiResponse.notFound(res, 'Expense not found');
    }

    const { title, category, amount, date, paymentMode, notes, receiptImage } = req.body;

    if (title) expense.title = title.trim();
    if (category) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount);
    if (date) expense.date = new Date(date);
    if (paymentMode) expense.paymentMode = paymentMode;
    if (notes !== undefined) expense.notes = notes;
    if (receiptImage !== undefined) expense.receiptImage = receiptImage;

    await expense.save();
    return ApiResponse.success(res, expense, 'Expense updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Expense
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return ApiResponse.notFound(res, 'Expense not found');
    }

    await Expense.findByIdAndDelete(req.params.id);
    return ApiResponse.success(res, null, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
};
