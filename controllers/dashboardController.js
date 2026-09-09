const Bill = require('../models/Bill');
const RepairJob = require('../models/RepairJob');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get Comprehensive Dashboard Statistics
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();

    // Start of Today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of Current Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Sales & Profit Aggregations
    const todaySalesAgg = await Bill.aggregate([
      { $match: { date: { $gte: startOfToday }, status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, sales: { $sum: '$grandTotal' }, profit: { $sum: '$profit' } } }
    ]);

    const monthlySalesAgg = await Bill.aggregate([
      { $match: { date: { $gte: startOfMonth }, status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, sales: { $sum: '$grandTotal' }, profit: { $sum: '$profit' } } }
    ]);

    const totalSalesAgg = await Bill.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, sales: { $sum: '$grandTotal' }, profit: { $sum: '$profit' } } }
    ]);

    // 2. Repair Statistics
    const repairRevenueAgg = await RepairJob.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$financials.grandTotal' } } }
    ]);

    const pendingRepairsCount = await RepairJob.countDocuments({
      status: { $in: ['Received', 'Diagnosing', 'Waiting Approval', 'Waiting Parts', 'Repairing', 'Quality Check'] }
    });

    const readyForPickupCount = await RepairJob.countDocuments({
      status: 'Ready Pickup'
    });

    // 3. Inventory & Customers Counts
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$minStock'] },
      isActive: true
    });

    const productsCount = await Product.countDocuments({ isActive: true });
    const customersCount = await Customer.countDocuments();

    // 4. Sales & Profit Chart (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesChartAgg = await Bill.aggregate([
      { $match: { date: { $gte: sevenDaysAgo }, status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          dailySales: { $sum: '$grandTotal' },
          dailyProfit: { $sum: '$profit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format 7 days continuous labels
    const chartLabels = [];
    const salesData = [];
    const profitData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = salesChartAgg.find(item => item._id === dateStr);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      chartLabels.push(dayName);
      salesData.push(found ? found.dailySales : 0);
      profitData.push(found ? found.dailyProfit : 0);
    }

    // 5. Repair Status Breakdown
    const repairStatusAgg = await RepairJob.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 6. Top Selling Products (From bills)
    const topProductsAgg = await Bill.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQty: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // 7. Recent Bills (Last 5)
    const recentBills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber customerSnapshot grandTotal paymentMode status date');

    // 8. Recent Repairs (Last 5)
    const recentRepairs = await RepairJob.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('ticketNumber customerDetails deviceDetails status financials.grandTotal receivedDate');

    return ApiResponse.success(res, {
      cards: {
        todaySales: todaySalesAgg[0]?.sales || 0,
        todayProfit: todaySalesAgg[0]?.profit || 0,
        monthlySales: monthlySalesAgg[0]?.sales || 0,
        monthlyProfit: monthlySalesAgg[0]?.profit || 0,
        totalSales: totalSalesAgg[0]?.sales || 0,
        totalProfit: totalSalesAgg[0]?.profit || 0,
        repairRevenue: repairRevenueAgg[0]?.revenue || 0,
        pendingRepairs: pendingRepairsCount,
        readyForPickup: readyForPickupCount,
        lowStock: lowStockCount,
        productsCount,
        customersCount
      },
      charts: {
        salesChart: {
          labels: chartLabels,
          sales: salesData,
          profit: profitData
        },
        repairStatistics: repairStatusAgg.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        topSellingProducts: topProductsAgg
      },
      recent: {
        bills: recentBills,
        repairs: recentRepairs
      }
    }, 'Dashboard stats fetched successfully');
  } catch (error) {
    next(error);
  }
};
