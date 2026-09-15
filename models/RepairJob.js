const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date }
});

const serviceItemSchema = new mongoose.Schema({
  serviceName: { type: String, required: true },
  checklist: [checklistItemSchema],
  customNotes: { type: String, default: '' },
  serviceCost: { type: Number, default: 0 }
});

const partUsedSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  name: { type: String, required: true },
  barcode: { type: String, default: '' },
  quantity: { type: Number, default: 1, min: 1 },
  unitCost: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 }
});

const timelineEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'Received',
      'Diagnosing',
      'Waiting Approval',
      'Waiting Parts',
      'Repairing',
      'Quality Check',
      'Ready Pickup',
      'Delivered',
      'Cancelled'
    ]
  },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const conditionChecklistSchema = new mongoose.Schema({
  screen: { type: String, default: 'Good', enum: ['Good', 'Scratched', 'Cracked', 'Flickering', 'No Display', 'N/A'] },
  body: { type: String, default: 'Good', enum: ['Good', 'Minor Scratches', 'Dented', 'Broken Hinges', 'Severe Damage'] },
  keyboard: { type: String, default: 'Working', enum: ['Working', 'Keys Missing', 'Partial Failure', 'Not Working', 'N/A'] },
  battery: { type: String, default: 'Working', enum: ['Working', 'Degraded', 'Dead', 'Swollen', 'Missing', 'N/A'] },
  camera: { type: String, default: 'Working', enum: ['Working', 'Faulty', 'Not Working', 'N/A'] },
  speakers: { type: String, default: 'Working', enum: ['Working', 'Distorted', 'Muted/Dead', 'N/A'] },
  usbPorts: { type: String, default: 'Working', enum: ['Working', 'Loose', 'Damaged', 'Not Working'] },
  hdmi: { type: String, default: 'Working', enum: ['Working', 'Damaged', 'Not Working', 'N/A'] },
  wifi: { type: String, default: 'Working', enum: ['Working', 'Weak Signal', 'Not Working', 'N/A'] },
  bluetooth: { type: String, default: 'Working', enum: ['Working', 'Not Working', 'N/A'] },
  touchpad: { type: String, default: 'Working', enum: ['Working', 'Erratic', 'Dead', 'N/A'] },
  powerButton: { type: String, default: 'Working', enum: ['Working', 'Stuck', 'Loose', 'Broken'] },
  conditionNotes: { type: String, default: '' }
});

const repairJobSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      unique: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    customerDetails: {
      name: { type: String, required: [true, 'Customer name is required'] },
      phone: { type: String, required: [true, 'Customer phone is required'] },
      email: { type: String, default: '' },
      address: { type: String, default: '' }
    },
    deviceDetails: {
      deviceType: {
        type: String,
        required: true,
        enum: ['Laptop', 'Desktop', 'Printer', 'CCTV', 'Networking', 'Mobile', 'Tablet', 'Other'],
        default: 'Laptop'
      },
      brand: { type: String, default: '' },
      model: { type: String, default: '' },
      serialNumber: { type: String, default: '' },
      color: { type: String, default: '' },
      devicePassword: { type: String, default: '' },
      accessoriesReceived: [{ type: String }], // e.g. ['Power Adapter', 'Bag', 'Power Cord', 'Remote']
      condition: {
        type: conditionChecklistSchema,
        default: () => ({})
      },
      photos: [{ type: String }] // File URLs
    },
    problemDescription: {
      type: String,
      default: ''
    },
    technicianNotes: {
      type: String,
      default: ''
    },
    services: [serviceItemSchema],
    partsUsed: [partUsedSchema],
    status: {
      type: String,
      enum: [
        'Received',
        'Diagnosing',
        'Waiting Approval',
        'Waiting Parts',
        'Repairing',
        'Quality Check',
        'Ready Pickup',
        'Delivered',
        'Cancelled'
      ],
      default: 'Received',
      index: true
    },
    timeline: [timelineEntrySchema],
    // Financial Breakdown
    financials: {
      labourCharge: { type: Number, default: 0 },
      partsCost: { type: Number, default: 0 },
      estimatedCost: { type: Number, default: 0 },
      gstRate: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
      advancePaid: { type: Number, default: 0 },
      dueAmount: { type: Number, default: 0 },
      paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Card', 'Credit/Due', 'Split'],
        default: 'Cash'
      }
    },
    warrantyDays: {
      type: Number,
      default: 30
    },
    expectedDeliveryDate: {
      type: Date
    },
    deliveredDate: {
      type: Date
    },
    receivedDate: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RepairJob', repairJobSchema);
