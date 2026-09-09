const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true
    },
    changeQty: {
      type: Number,
      required: [true, 'Change quantity is required']
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['Sale', 'Repair', 'Purchase', 'Restock', 'Damage', 'Recount', 'Return'],
      required: true,
      index: true
    },
    referenceId: {
      type: String,
      default: ''
    },
    referenceModel: {
      type: String,
      enum: ['Bill', 'RepairJob', 'Supplier', 'Manual'],
      default: 'Manual'
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

module.exports = mongoose.model('StockHistory', stockHistorySchema);
