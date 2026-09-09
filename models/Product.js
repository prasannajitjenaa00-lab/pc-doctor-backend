const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
      min: [0, 'Buy price cannot be negative'],
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      default: 0
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0
    },
    minStock: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock threshold cannot be negative']
    },
    image: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    warrantyMonths: {
      type: Number,
      default: 12
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for Profit per unit
productSchema.virtual('profit').get(function () {
  return (this.sellingPrice || 0) - (this.buyPrice || 0);
});

// Virtual for Margin Percentage
productSchema.virtual('margin').get(function () {
  if (!this.sellingPrice || this.sellingPrice === 0) return 0;
  const profit = this.sellingPrice - (this.buyPrice || 0);
  return Number(((profit / this.sellingPrice) * 100).toFixed(2));
});

// Virtual for isLowStock
productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.minStock;
});

module.exports = mongoose.model('Product', productSchema);
