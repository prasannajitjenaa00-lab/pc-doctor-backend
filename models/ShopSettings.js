const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      default: 'PC Doctor',
      trim: true
    },
    tagline: {
      type: String,
      default: 'Computer, Laptop, CCTV & Networking Solutions',
      trim: true
    },
    logo: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: '+91 98765 43210'
    },
    alternatePhone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: 'support@pcdoctor.local'
    },
    address: {
      type: String,
      default: 'Shop #12, Tech Market, Main Commercial Road'
    },
    city: {
      type: String,
      default: 'Metro City'
    },
    state: {
      type: String,
      default: 'State'
    },
    pincode: {
      type: String,
      default: '751001'
    },
    gstNumber: {
      type: String,
      default: ''
    },
    invoicePrefix: {
      type: String,
      default: 'INV'
    },
    repairPrefix: {
      type: String,
      default: 'REP'
    },
    invoiceFooter: {
      type: String,
      default: 'Thank you for choosing PC Doctor! Goods once sold can be exchanged within 7 days with invoice.'
    },
    termsAndConditions: {
      type: String,
      default: '1. Device inspection charges are non-refundable.\n2. Please collect devices within 30 days of completion notification.\n3. Shop is not responsible for data loss. Customers must backup before submission.\n4. 30-day warranty applies only to specific replaced hardware components.'
    },
    currencySymbol: {
      type: String,
      default: '₹'
    },
    themeColor: {
      type: String,
      default: '#2563eb'
    },
    upiId: {
      type: String,
      default: ''
    },
    defaultGstRate: {
      type: Number,
      default: 18
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
