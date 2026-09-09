const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const ShopSettings = require('../models/ShopSettings');
const Expense = require('../models/Expense');

dotenv.config({ path: __dirname + '/../.env' });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pc_doctor');
    console.log('[Seeder] Connected to database...');

    // 1. Seed Shop Settings if not exists
    const settingsCount = await ShopSettings.countDocuments();
    if (settingsCount === 0) {
      await ShopSettings.create({
        shopName: 'PC Doctor Repair & Tech Solutions',
        tagline: 'Expert Laptop, Desktop, Printer & CCTV Repairs',
        phone: '+91 98765 43210',
        email: 'contact@pcdoctor.com',
        address: '104 Computer Plaza, Commercial Hub',
        city: 'Technology City',
        state: 'Tech State',
        pincode: '560001',
        gstNumber: '29ABCDE1234F1Z5',
        invoicePrefix: 'INV',
        repairPrefix: 'REP',
        defaultGstRate: 18,
        upiId: 'pcdoctor@upi'
      });
      console.log('[Seeder] Default Shop Settings created.');
    }

    // 2. Seed Categories
    const categoriesCount = await Category.countDocuments();
    let categoriesMap = {};
    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'Storage (SSD / HDD)', description: 'SATA, NVMe SSDs & External Drives', color: '#3b82f6' },
        { name: 'RAM / Memory', description: 'DDR3, DDR4, DDR5 Desktop & Laptop RAM', color: '#10b981' },
        { name: 'Laptop Components', description: 'Screens, Keyboards, Batteries, Hinges', color: '#8b5cf6' },
        { name: 'Peripherals', description: 'Keyboards, Mice, Cables, Webcams, Adapters', color: '#f59e0b' },
        { name: 'Networking & CCTV', description: 'Routers, Switches, CCTV Cameras, Cables', color: '#ef4444' },
        { name: 'Power & Adapters', description: 'Laptop Chargers, SMPS, UPS Batteries', color: '#06b6d4' },
        { name: 'Consumables & Tools', description: 'Thermal Paste, IPA, Soldering Wire, Solder Wick', color: '#64748b' }
      ];

      const inserted = await Category.insertMany(defaultCategories);
      inserted.forEach(cat => {
        categoriesMap[cat.name] = cat._id;
      });
      console.log('[Seeder] Default Categories seeded.');
    } else {
      const existing = await Category.find();
      existing.forEach(cat => {
        categoriesMap[cat.name] = cat._id;
      });
    }

    // 3. Seed Sample Products
    const productsCount = await Product.countDocuments();
    if (productsCount === 0 && Object.keys(categoriesMap).length > 0) {
      const sampleProducts = [
        {
          name: 'Crucial BX500 500GB 2.5" SATA SSD',
          barcode: '850012345678',
          sku: 'SSD-CRU-500',
          category: categoriesMap['Storage (SSD / HDD)'],
          buyPrice: 2200,
          sellingPrice: 2900,
          stock: 14,
          minStock: 4,
          description: 'High speed 2.5" SATA 6Gbps Solid State Drive'
        },
        {
          name: 'Kingston NV2 1TB M.2 PCIe 4.0 NVMe SSD',
          barcode: '850012345679',
          sku: 'SSD-KNG-1TB',
          category: categoriesMap['Storage (SSD / HDD)'],
          buyPrice: 4600,
          sellingPrice: 5800,
          stock: 8,
          minStock: 3,
          description: 'Gen 4x4 NVMe M.2 2280 internal SSD'
        },
        {
          name: 'Crucial 8GB DDR4 3200MHz Laptop RAM',
          barcode: '850012345680',
          sku: 'RAM-CRU-8GB-D4',
          category: categoriesMap['RAM / Memory'],
          buyPrice: 1350,
          sellingPrice: 1850,
          stock: 18,
          minStock: 5,
          description: 'SODIMM 1.2V CL22 Notebook Memory'
        },
        {
          name: 'Corsair Vengeance LPX 16GB DDR4 3200MHz Desktop RAM',
          barcode: '850012345681',
          sku: 'RAM-COR-16GB-D4',
          category: categoriesMap['RAM / Memory'],
          buyPrice: 2700,
          sellingPrice: 3400,
          stock: 10,
          minStock: 3,
          description: 'High performance heatsink desktop RAM'
        },
        {
          name: 'Arctic MX-4 High Performance Thermal Paste (4g)',
          barcode: '850012345682',
          sku: 'TOOL-ARC-MX4',
          category: categoriesMap['Consumables & Tools'],
          buyPrice: 280,
          sellingPrice: 450,
          stock: 25,
          minStock: 6,
          description: 'Carbon micro-particle thermal compound'
        },
        {
          name: 'Dell 65W 19.5V 3.34A Barrel Laptop Charger',
          barcode: '850012345683',
          sku: 'PWR-DEL-65W',
          category: categoriesMap['Power & Adapters'],
          buyPrice: 650,
          sellingPrice: 1100,
          stock: 12,
          minStock: 4,
          description: '4.5mm small pin Dell genuine replacement adapter'
        },
        {
          name: 'HP 15.6" Slim 30-Pin FHD IPS Screen (1920x1080)',
          barcode: '850012345684',
          sku: 'SCR-HP-156-FHD',
          category: categoriesMap['Laptop Components'],
          buyPrice: 2900,
          sellingPrice: 3900,
          stock: 3,
          minStock: 2,
          description: 'Matte display panel 30 pin bottom-right connector'
        },
        {
          name: 'CP PLUS 2MP Full HD IR Dome CCTV Camera (CP-VAC-D24L2)',
          barcode: '850012345685',
          sku: 'CCTV-CP-DOME',
          category: categoriesMap['Networking & CCTV'],
          buyPrice: 850,
          sellingPrice: 1350,
          stock: 15,
          minStock: 4,
          description: '20M Night Vision 1080P Analog HD camera'
        },
        {
          name: 'Logitech MK215 Wireless Keyboard and Mouse Combo',
          barcode: '850012345686',
          sku: 'PER-LOG-MK215',
          category: categoriesMap['Peripherals'],
          buyPrice: 1150,
          sellingPrice: 1550,
          stock: 9,
          minStock: 3,
          description: 'Compact 2.4GHz wireless keyboard mouse combo'
        }
      ];

      await Product.insertMany(sampleProducts);
      console.log('[Seeder] Sample Products seeded.');
    }

    // 4. Seed Sample Customers
    const customersCount = await Customer.countDocuments();
    if (customersCount === 0) {
      await Customer.insertMany([
        {
          name: 'Rajesh Sharma',
          phone: '9823011223',
          email: 'rajesh.sharma@example.com',
          address: 'Flat 402, Green Valley Apartments',
          totalPurchases: 3,
          totalSpent: 8500,
          outstandingDue: 0
        },
        {
          name: 'Priya Verma',
          phone: '9711223344',
          email: 'priya.v@example.com',
          address: 'B-12, Sector 4, Tech Enclave',
          totalPurchases: 2,
          totalSpent: 4200,
          outstandingDue: 0
        }
      ]);
      console.log('[Seeder] Sample Customers seeded.');
    }

    // 5. Seed Sample Supplier
    const suppliersCount = await Supplier.countDocuments();
    if (suppliersCount === 0) {
      await Supplier.insertMany([
        {
          name: 'Anand Kumar',
          company: 'Silicon Tech Wholesale Distributers',
          phone: '9988776655',
          email: 'sales@silicontechdist.com',
          address: 'Shop 25, Central Electronics Market',
          gstNumber: '29AABCS1429B1Z8'
        }
      ]);
      console.log('[Seeder] Sample Supplier seeded.');
    }

    console.log('[Seeder] Database Seeding Completed Successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error] ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
