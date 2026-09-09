const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'Shop Rent',
        'Electricity & Utilities',
        'Staff Salary',
        'Tools & Equipment',
        'Repair Components',
        'Tea & Refreshments',
        'Internet & Phone',
        'Marketing & Ads',
        'Shop Maintenance',
        'Taxes & Software',
        'Miscellaneous'
      ],
      default: 'Miscellaneous',
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Card'],
      default: 'Cash'
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    receiptImage: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Expense', expenseSchema);
