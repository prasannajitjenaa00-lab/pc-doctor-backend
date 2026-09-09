const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false // May be custom/one-off items
  },
  name: {
    type: String,
    required: [true, 'Item name is required']
  },
  barcode: {
    type: String,
    default: ''
  },
  sku: {
    type: String,
    default: ''
  },
  qty: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  buyPrice: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  gstRate: {
    type: Number,
    default: 0 // e.g. 18 for 18%
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: [true, 'Total item amount is required']
  }
});

const billSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    customerSnapshot: {
      name: { type: String, default: 'Walk-in Customer' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      gstNumber: { type: String, default: '' }
    },
    items: [billItemSchema],
    subTotal: {
      type: Number,
      required: true,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    discountValue: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    totalCost: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Credit/Due', 'Split'],
      default: 'Cash'
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    dueAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Paid', 'Partial', 'Unpaid', 'Cancelled'],
      default: 'Paid',
      index: true
    },
    notes: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Bill', billSchema);
