const Bill = require('../models/Bill');
const RepairJob = require('../models/RepairJob');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const { generateInventoryExcel, generateSalesReportExcel } = require('../services/excelService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get Comprehensive Sales & Profit Analytics
 */
exports.getSalesReport = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    const query = { status: { $ne: 'Cancelled' } };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    let dateFormat = '%Y-%m-%d';
    if (period === 'monthly') dateFormat = '%Y-%m';
    if (period === 'yearly') dateFormat = '%Y';

    const [trends, totals, paymentModes] = await Promise.all([
      Bill.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$date' } },
            totalSales: { $sum: '$grandTotal' },
            totalProfit: { $sum: '$profit' },
            billsCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Bill.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$grandTotal' },
            totalProfit: { $sum: '$profit' },
            totalDiscounts: { $sum: '$discountAmount' },
            totalTax: { $sum: '$taxAmount' },
            totalBills: { $sum: 1 }
          }
        }
      ]),
      Bill.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$paymentMode',
            amount: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return ApiResponse.success(res, {
      trends,
      summary: totals[0] || {
        totalSales: 0,
        totalProfit: 0,
        totalDiscounts: 0,
        totalTax: 0,
        totalBills: 0
      },
      paymentBreakdown: paymentModes
    }, 'Sales report retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Repair Performance Analytics
 */
exports.getRepairReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.receivedDate = {};
      if (startDate) query.receivedDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = end;
      }
    }

    const [byStatus, byDeviceType, byBrand, financialSummary] = await Promise.all([
      RepairJob.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      RepairJob.aggregate([
        { $match: query },
        { $group: { _id: '$deviceDetails.deviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      RepairJob.aggregate([
        { $match: query },
        { $group: { _id: '$deviceDetails.brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      RepairJob.aggregate([
        { $match: { ...query, status: { $ne: 'Cancelled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$financials.grandTotal' },
            totalLabour: { $sum: '$financials.labourCharge' },
            totalParts: { $sum: '$financials.partsCost' },
            totalAdvance: { $sum: '$financials.advancePaid' },
            totalDue: { $sum: '$financials.dueAmount' }
          }
        }
      ])
    ]);

    return ApiResponse.success(res, {
      byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      byDeviceType,
      byBrand,
      financials: financialSummary[0] || {
        totalRevenue: 0,
        totalLabour: 0,
        totalParts: 0,
        totalAdvance: 0,
        totalDue: 0
      }
    }, 'Repair report retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Inventory Stock & Valuation Report
 */
exports.getInventoryReport = async (req, res, next) => {
  try {
    const [summary, categoryValuation, lowStockItems] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItemsCount: { $sum: 1 },
            totalStockQuantity: { $sum: '$stock' },
            totalAssetValue: { $sum: { $multiply: ['$stock', '$buyPrice'] } },
            totalRetailValue: { $sum: { $multiply: ['$stock', '$sellingPrice'] } }
          }
        }
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            itemCount: { $sum: 1 },
            stockQty: { $sum: '$stock' },
            assetValue: { $sum: { $multiply: ['$stock', '$buyPrice'] } }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoryName: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
            itemCount: 1,
            stockQty: 1,
            assetValue: 1
          }
        },
        { $sort: { assetValue: -1 } }
      ]),
      Product.find({
        isActive: true,
        $expr: { $lte: ['$stock', '$minStock'] }
      }).populate('category', 'name')
    ]);

    return ApiResponse.success(res, {
      valuation: summary[0] || {
        totalItemsCount: 0,
        totalStockQuantity: 0,
        totalAssetValue: 0,
        totalRetailValue: 0
      },
      categoryValuation,
      lowStockItems
    }, 'Inventory report retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Export Inventory to Excel Workbook
 */
exports.exportInventoryExcel = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .sort({ name: 1 });

    const buffer = await generateInventoryExcel(products);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="PC-Doctor-Inventory.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    return res.end(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Sales Report to Excel Workbook
 */
exports.exportSalesExcel = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { status: { $ne: 'Cancelled' } };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const bills = await Bill.find(query).sort({ date: -1 });
    const buffer = await generateSalesReportExcel(bills);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="PC-Doctor-Sales-Report.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    return res.end(buffer);
  } catch (error) {
    next(error);
  }
};
