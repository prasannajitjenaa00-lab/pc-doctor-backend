const Product = require('../models/Product');
const Category = require('../models/Category');
const StockHistory = require('../models/StockHistory');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get all products with filtering, search, sorting and pagination
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category,
      lowStock,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = { isActive: true };

    // Search by name, barcode, or SKU
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { barcode: searchRegex },
        { sku: searchRegex }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by low stock threshold
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name color')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    return ApiResponse.success(res, products, 'Products retrieved successfully', 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Product by ID
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name color');
    if (!product) {
      return ApiResponse.notFound(res, 'Product not found');
    }
    return ApiResponse.success(res, product);
  } catch (error) {
    next(error);
  }
};

/**
 * Find Product by Barcode or SKU (for barcode scanner instant match)
 */
exports.findByBarcodeOrSku = async (req, res, next) => {
  try {
    const { code } = req.params;
    const product = await Product.findOne({
      $or: [{ barcode: code }, { sku: code }],
      isActive: true
    }).populate('category', 'name color');

    if (!product) {
      return ApiResponse.notFound(res, `No product found matching code '${code}'`);
    }

    return ApiResponse.success(res, product, 'Product found');
  } catch (error) {
    next(error);
  }
};

/**
 * Create New Product
 */
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      barcode,
      sku,
      category,
      buyPrice,
      sellingPrice,
      stock = 0,
      minStock = 5,
      image,
      description,
      warrantyMonths
    } = req.body;

    // Generate automatic SKU if not provided
    const generatedSku = sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    // Generate barcode if not provided
    const generatedBarcode = barcode?.trim() || `890${Date.now().toString().slice(-9)}`;

    const product = await Product.create({
      name,
      barcode: generatedBarcode,
      sku: generatedSku,
      category,
      buyPrice: Number(buyPrice),
      sellingPrice: Number(sellingPrice),
      stock: Number(stock),
      minStock: Number(minStock),
      image: image || '',
      description: description || '',
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : 12
    });

    // Record initial stock entry
    if (Number(stock) > 0) {
      await StockHistory.create({
        product: product._id,
        changeQty: Number(stock),
        previousStock: 0,
        newStock: Number(stock),
        type: 'Restock',
        notes: 'Initial inventory stock'
      });
    }

    const populated = await Product.findById(product._id).populate('category', 'name color');
    return ApiResponse.created(res, populated, 'Product created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update Product Details
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return ApiResponse.notFound(res, 'Product not found');
    }

    const {
      name,
      barcode,
      sku,
      category,
      buyPrice,
      sellingPrice,
      minStock,
      image,
      description,
      warrantyMonths,
      isActive
    } = req.body;

    if (name !== undefined) product.name = name;
    if (barcode !== undefined) product.barcode = barcode;
    if (sku !== undefined) product.sku = sku;
    if (category !== undefined) product.category = category;
    if (buyPrice !== undefined) product.buyPrice = Number(buyPrice);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (minStock !== undefined) product.minStock = Number(minStock);
    if (image !== undefined) product.image = image;
    if (description !== undefined) product.description = description;
    if (warrantyMonths !== undefined) product.warrantyMonths = Number(warrantyMonths);
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    const updated = await Product.findById(product._id).populate('category', 'name color');
    return ApiResponse.success(res, updated, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust Stock (Manual adjustment with reason and audit trail)
 */
exports.adjustStock = async (req, res, next) => {
  try {
    const { changeQty, type = 'Recount', notes = '' } = req.body;
    const qtyNumber = Number(changeQty);

    if (isNaN(qtyNumber) || qtyNumber === 0) {
      return ApiResponse.badRequest(res, 'Change quantity must be a non-zero number');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return ApiResponse.notFound(res, 'Product not found');
    }

    const previousStock = product.stock;
    const newStock = previousStock + qtyNumber;

    if (newStock < 0) {
      return ApiResponse.badRequest(res, `Cannot reduce stock below 0. Current stock is ${previousStock}`);
    }

    product.stock = newStock;
    await product.save();

    await StockHistory.create({
      product: product._id,
      changeQty: qtyNumber,
      previousStock,
      newStock,
      type,
      notes,
      referenceModel: 'Manual'
    });

    return ApiResponse.success(res, product, `Stock adjusted successfully to ${newStock}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Product Stock History Audit Log
 */
exports.getStockHistory = async (req, res, next) => {
  try {
    const history = await StockHistory.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100);
    return ApiResponse.success(res, history, 'Stock history retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Product (Soft delete)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return ApiResponse.notFound(res, 'Product not found');
    }

    product.isActive = false;
    await product.save();

    return ApiResponse.success(res, null, 'Product removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Seed sample / dummy products and categories
 */
exports.seedDemoProducts = async (req, res, next) => {
  try {
    // 1. Ensure categories exist
    const defaultCategories = [
      { name: 'Storage (SSD / HDD)', description: 'SATA, NVMe SSDs & External Drives', color: '#3b82f6' },
      { name: 'RAM / Memory', description: 'DDR3, DDR4, DDR5 Desktop & Laptop RAM', color: '#10b981' },
      { name: 'Laptop Components', description: 'Screens, Keyboards, Batteries, Hinges', color: '#8b5cf6' },
      { name: 'Peripherals & Accessories', description: 'Keyboards, Mice, Cables, Webcams, Flash Drives', color: '#f59e0b' },
      { name: 'Networking & CCTV', description: 'Routers, Switches, CCTV Cameras, Cables', color: '#ef4444' },
      { name: 'Power Supplies & Adapters', description: 'Laptop Chargers, SMPS, UPS Batteries', color: '#06b6d4' },
      { name: 'Consumables & Repair Tools', description: 'Thermal Paste, Solder Paste, Flux, Tools', color: '#64748b' }
    ];

    const categoryMap = {};
    for (const cat of defaultCategories) {
      let existingCat = await Category.findOne({ name: cat.name });
      if (!existingCat) {
        existingCat = await Category.create(cat);
      }
      categoryMap[cat.name] = existingCat._id;
    }

    // 2. Dummy products catalog
    const dummyProductsList = [
      {
        name: 'Crucial BX500 500GB 2.5" SATA SSD',
        sku: 'SSD-CRU-500',
        barcode: '890123456001',
        category: categoryMap['Storage (SSD / HDD)'],
        buyPrice: 2200,
        sellingPrice: 2900,
        stock: 16,
        minStock: 4,
        warrantyMonths: 36,
        description: 'High speed 2.5" SATA 6Gbps SSD with up to 540MB/s read speeds'
      },
      {
        name: 'Kingston NV2 1TB M.2 NVMe PCIe 4.0 SSD',
        sku: 'SSD-KNG-1TB',
        barcode: '890123456002',
        category: categoryMap['Storage (SSD / HDD)'],
        buyPrice: 4600,
        sellingPrice: 5800,
        stock: 9,
        minStock: 3,
        warrantyMonths: 36,
        description: 'Gen 4x4 NVMe M.2 2280 internal high performance SSD'
      },
      {
        name: 'Western Digital Blue 1TB 3.5" 7200RPM HDD',
        sku: 'HDD-WD-1TB',
        barcode: '890123456003',
        category: categoryMap['Storage (SSD / HDD)'],
        buyPrice: 3100,
        sellingPrice: 3850,
        stock: 7,
        minStock: 2,
        warrantyMonths: 24,
        description: 'Reliable 3.5" internal desktop storage hard drive'
      },
      {
        name: 'Crucial 8GB DDR4 3200MHz Laptop RAM',
        sku: 'RAM-CRU-8GB-L',
        barcode: '890123456004',
        category: categoryMap['RAM / Memory'],
        buyPrice: 1350,
        sellingPrice: 1850,
        stock: 22,
        minStock: 5,
        warrantyMonths: 36,
        description: 'SODIMM 1.2V CL22 Notebook laptop memory module'
      },
      {
        name: 'Corsair Vengeance LPX 16GB DDR4 3200MHz Desktop RAM',
        sku: 'RAM-COR-16GB-D',
        barcode: '890123456005',
        category: categoryMap['RAM / Memory'],
        buyPrice: 2650,
        sellingPrice: 3450,
        stock: 11,
        minStock: 3,
        warrantyMonths: 36,
        description: 'Pure aluminum heat spreader desktop gaming memory'
      },
      {
        name: 'Kingston Fury Beast 8GB DDR4 3200MHz Desktop RAM',
        sku: 'RAM-KNG-8GB-D',
        barcode: '890123456006',
        category: categoryMap['RAM / Memory'],
        buyPrice: 1450,
        sellingPrice: 1950,
        stock: 14,
        minStock: 4,
        warrantyMonths: 36,
        description: 'Low-profile stylish heat spreader desktop memory'
      },
      {
        name: 'HP 15.6" Slim FHD 30-Pin IPS Replacement Screen',
        sku: 'SCR-HP-156-FHD',
        barcode: '890123456007',
        category: categoryMap['Laptop Components'],
        buyPrice: 2950,
        sellingPrice: 4100,
        stock: 4,
        minStock: 2,
        warrantyMonths: 6,
        description: '1920x1080 Full HD matte IPS panel with bottom-right 30 pin connector'
      },
      {
        name: 'Dell Inspiron 15 3511 / 3521 Replacement Keyboard',
        sku: 'KB-DEL-3511',
        barcode: '890123456008',
        category: categoryMap['Laptop Components'],
        buyPrice: 550,
        sellingPrice: 950,
        stock: 6,
        minStock: 2,
        warrantyMonths: 3,
        description: 'OEM standard US layout laptop internal replacement keyboard'
      },
      {
        name: 'Dell 65W 19.5V 3.34A 4.5mm Small Pin Laptop Adapter',
        sku: 'PWR-DEL-65W',
        barcode: '890123456009',
        category: categoryMap['Power Supplies & Adapters'],
        buyPrice: 650,
        sellingPrice: 1150,
        stock: 15,
        minStock: 4,
        warrantyMonths: 12,
        description: 'Genuine replacement charger with power cord for Dell Inspiron & Vostro'
      },
      {
        name: 'Lenovo 65W USB Type-C Smart Fast Charger',
        sku: 'PWR-LEN-TYPEC',
        barcode: '890123456010',
        category: categoryMap['Power Supplies & Adapters'],
        buyPrice: 850,
        sellingPrice: 1450,
        stock: 12,
        minStock: 3,
        warrantyMonths: 12,
        description: '65W Type-C AC power adapter for Lenovo ThinkPad, IdeaPad & modern laptops'
      },
      {
        name: 'Logitech MK215 Wireless Keyboard and Mouse Combo',
        sku: 'PER-LOG-MK215',
        barcode: '890123456011',
        category: categoryMap['Peripherals & Accessories'],
        buyPrice: 1180,
        sellingPrice: 1599,
        stock: 8,
        minStock: 3,
        warrantyMonths: 12,
        description: '2.4 GHz reliable wireless connection with nano USB receiver'
      },
      {
        name: 'Logitech B100 Optical USB Wired Mouse',
        sku: 'PER-LOG-B100',
        barcode: '890123456012',
        category: categoryMap['Peripherals & Accessories'],
        buyPrice: 210,
        sellingPrice: 350,
        stock: 30,
        minStock: 8,
        warrantyMonths: 12,
        description: '800 DPI ambidextrous comfortable optical office mouse'
      },
      {
        name: 'TP-Link Archer C6 AC1200 MU-MIMO Gigabit Wi-Fi Router',
        sku: 'NET-TPL-C6',
        barcode: '890123456013',
        category: categoryMap['Networking & CCTV'],
        buyPrice: 1950,
        sellingPrice: 2650,
        stock: 6,
        minStock: 2,
        warrantyMonths: 36,
        description: 'Dual band 867Mbps (5GHz) + 300Mbps (2.4GHz) high speed router with 4 antennas'
      },
      {
        name: 'CP PLUS 2MP Full HD IR Dome CCTV Camera (CP-VAC-D24L2)',
        sku: 'CCTV-CP-DOME2',
        barcode: '890123456014',
        category: categoryMap['Networking & CCTV'],
        buyPrice: 820,
        sellingPrice: 1350,
        stock: 18,
        minStock: 5,
        warrantyMonths: 24,
        description: '20M Night Vision 1080P Analog HD indoor surveillance camera'
      },
      {
        name: 'Arctic MX-4 High Performance Thermal Paste (4g Syringe)',
        sku: 'TOOL-ARC-MX4',
        barcode: '890123456015',
        category: categoryMap['Consumables & Repair Tools'],
        buyPrice: 270,
        sellingPrice: 450,
        stock: 25,
        minStock: 6,
        warrantyMonths: 0,
        description: 'Carbon micro-particle thermal compound for CPU/GPU repasting'
      },
      {
        name: 'Relife RL-404 183°C Soldering Paste (40g Syringe with Plunger)',
        sku: 'TOOL-REL-RL404',
        barcode: '890123456016',
        category: categoryMap['Consumables & Repair Tools'],
        buyPrice: 190,
        sellingPrice: 320,
        stock: 15,
        minStock: 4,
        warrantyMonths: 0,
        description: 'Sn63/Pb37 leaded SMD BGA solder paste for chip-level repair'
      },
      {
        name: 'Zebronics 450W Value SMPS Desktop Power Supply',
        sku: 'PWR-ZEB-450W',
        barcode: '890123456017',
        category: categoryMap['Power Supplies & Adapters'],
        buyPrice: 520,
        sellingPrice: 850,
        stock: 2,
        minStock: 5,
        warrantyMonths: 12,
        description: '450 Watt desktop computer ATX power supply unit with 80mm fan'
      },
      {
        name: 'SanDisk Ultra 64GB Dual Drive Go USB Type-C & Type-A Flash Drive',
        sku: 'ACC-SND-64GB',
        barcode: '890123456018',
        category: categoryMap['Peripherals & Accessories'],
        buyPrice: 510,
        sellingPrice: 750,
        stock: 19,
        minStock: 5,
        warrantyMonths: 60,
        description: '2-in-1 swivel flash drive for smartphones, MacBooks, and Windows PCs'
      }
    ];

    const addedProducts = [];
    for (const prod of dummyProductsList) {
      const exists = await Product.findOne({
        $or: [{ sku: prod.sku }, { barcode: prod.barcode }]
      });

      if (!exists) {
        const created = await Product.create(prod);
        addedProducts.push(created);

        // Record initial stock history
        await StockHistory.create({
          product: created._id,
          changeQty: created.stock,
          previousStock: 0,
          newStock: created.stock,
          type: 'Restock',
          notes: 'Initial demo catalog setup',
          referenceModel: 'Manual'
        });
      }
    }

    return ApiResponse.success(res, {
      count: addedProducts.length,
      products: addedProducts
    }, addedProducts.length > 0
      ? `Successfully added ${addedProducts.length} dummy products to catalogue!`
      : 'Demo products are already present in catalogue.', 200);
  } catch (error) {
    next(error);
  }
};

