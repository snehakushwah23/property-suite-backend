const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const Plot = require('../models/Plot');
const Agent = require('../models/Agent');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads with enhanced photo/signature support
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads', file.fieldname);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'buyerPhoto' || file.fieldname === 'sellerPhoto') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for photos!'), false);
    }
  } else if (file.fieldname === 'buyerSignature' || file.fieldname === 'sellerSignature') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for signatures!'), false);
    }
  } else {
    cb(new Error('Unknown field!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Test route for development - get plots without authentication
router.get('/test-data', async (req, res) => {
  try {
    console.log('📊 Test plots endpoint called (no auth required)');
    
    // Try to get real data from MongoDB
    const plots = await Plot.find().limit(10).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      message: 'Test data from MongoDB (development mode)',
      count: plots.length,
      plots: plots
    });
  } catch (error) {
    console.error('Error fetching test plots:', error);
    // Fallback to mock data if MongoDB fails
    res.json({
      success: true,
      message: 'Mock data (MongoDB not available)',
      plots: [
        {
          _id: '674350a1b2c3d4e5f6789012',
          plotNumber: 'P-001',
          buyerName: 'Rahul Patil',
          sellerName: 'Suresh Kumar',
          village: 'Jat',
          area: '1200 sq.ft',
          location: 'Near School',
          purchasePrice: 180000,
          salePrice: 250000,
          profit: 70000,
          paymentMode: 'GPay',
          date: '2024-10-15',
          status: 'Sold',
          buyerPhoto: '/uploads/buyerPhoto/sample-photo-1.jpg',
          buyerSignature: '/uploads/buyerSignature/sample-signature-1.jpg'
        },
        {
          _id: '674350a1b2c3d4e5f6789013',
          plotNumber: 'P-002',
          buyerName: 'Priya Sharma',
          sellerName: 'Amit Desai',
          village: 'Karad',
          area: '1500 sq.ft',
          location: 'Main Road',
          purchasePrice: 220000,
          salePrice: 0,
          profit: 0,
          paymentMode: 'Cash',
          date: '2024-10-20',
          status: 'Available',
          buyerPhoto: null,
          buyerSignature: null
        }
      ]
    });
  }
});

// Get all plots with pagination, filtering, and enhanced photo/signature display
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      village, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (village && village !== 'all') {
      filter.village = village;
    }
    
    if (search) {
      filter.$or = [
        { plotNumber: { $regex: search, $options: 'i' } },
        { buyerName: { $regex: search, $options: 'i' } },
        { sellerName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const plots = await Plot.find(filter)
      .populate('agentId', 'name phone commissionRate')
      .populate('createdBy', 'name username')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Plot.countDocuments(filter);

    // Add photo/signature URLs for frontend display
    const plotsWithFiles = plots.map(plot => {
      const plotObj = plot.toObject();
      
      // Convert file paths to accessible URLs
      if (plotObj.buyerPhoto) {
        plotObj.buyerPhotoUrl = `/uploads/buyerPhoto/${path.basename(plotObj.buyerPhoto)}`;
      }
      if (plotObj.buyerSignature) {
        plotObj.buyerSignatureUrl = `/uploads/buyerSignature/${path.basename(plotObj.buyerSignature)}`;
      }
      if (plotObj.sellerPhoto) {
        plotObj.sellerPhotoUrl = `/uploads/sellerPhoto/${path.basename(plotObj.sellerPhoto)}`;
      }
      if (plotObj.sellerSignature) {
        plotObj.sellerSignatureUrl = `/uploads/sellerSignature/${path.basename(plotObj.sellerSignature)}`;
      }
      
      return plotObj;
    });

    res.json({
      plots: plotsWithFiles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + plots.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get plot by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id)
      .populate('agentId', 'name phone commissionRate email')
      .populate('createdBy', 'name username');
    
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    const plotObj = plot.toObject();
    
    // Add file URLs
    if (plotObj.buyerPhoto) {
      plotObj.buyerPhotoUrl = `/uploads/buyerPhoto/${path.basename(plotObj.buyerPhoto)}`;
    }
    if (plotObj.buyerSignature) {
      plotObj.buyerSignatureUrl = `/uploads/buyerSignature/${path.basename(plotObj.buyerSignature)}`;
    }
    if (plotObj.sellerPhoto) {
      plotObj.sellerPhotoUrl = `/uploads/sellerPhoto/${path.basename(plotObj.sellerPhoto)}`;
    }
    if (plotObj.sellerSignature) {
      plotObj.sellerSignatureUrl = `/uploads/sellerSignature/${path.basename(plotObj.sellerSignature)}`;
    }
    
    res.json(plotObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new plot with photo and signature uploads
router.post('/', auth, upload.fields([
  { name: 'buyerPhoto', maxCount: 1 },
  { name: 'buyerSignature', maxCount: 1 },
  { name: 'sellerPhoto', maxCount: 1 },
  { name: 'sellerSignature', maxCount: 1 }
]), async (req, res) => {
  try {
    const plotData = { ...req.body };
    
    // Add file paths if files were uploaded
    if (req.files) {
      if (req.files.buyerPhoto) {
        plotData.buyerPhoto = req.files.buyerPhoto[0].path;
      }
      if (req.files.buyerSignature) {
        plotData.buyerSignature = req.files.buyerSignature[0].path;
      }
      if (req.files.sellerPhoto) {
        plotData.sellerPhoto = req.files.sellerPhoto[0].path;
      }
      if (req.files.sellerSignature) {
        plotData.sellerSignature = req.files.sellerSignature[0].path;
      }
    }
    
    plotData.createdBy = req.user.id;
    
    const plot = new Plot(plotData);
    await plot.save();
    
    // Populate the saved plot
    await plot.populate('agentId', 'name phone commissionRate');
    await plot.populate('createdBy', 'name username');
    
    res.status(201).json({
      message: 'Plot created successfully',
      plot
    });
  } catch (error) {
    // Clean up uploaded files if plot creation fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    
    if (error.code === 11000) {
      res.status(400).json({ error: 'Plot number already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update plot with photo and signature support
router.put('/:id', auth, upload.fields([
  { name: 'buyerPhoto', maxCount: 1 },
  { name: 'buyerSignature', maxCount: 1 },
  { name: 'sellerPhoto', maxCount: 1 },
  { name: 'sellerSignature', maxCount: 1 }
]), async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }

    const updateData = { ...req.body };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.buyerPhoto) {
        // Delete old file if exists
        if (plot.buyerPhoto && fs.existsSync(plot.buyerPhoto)) {
          fs.unlinkSync(plot.buyerPhoto);
        }
        updateData.buyerPhoto = req.files.buyerPhoto[0].path;
      }
      if (req.files.buyerSignature) {
        if (plot.buyerSignature && fs.existsSync(plot.buyerSignature)) {
          fs.unlinkSync(plot.buyerSignature);
        }
        updateData.buyerSignature = req.files.buyerSignature[0].path;
      }
      if (req.files.sellerPhoto) {
        if (plot.sellerPhoto && fs.existsSync(plot.sellerPhoto)) {
          fs.unlinkSync(plot.sellerPhoto);
        }
        updateData.sellerPhoto = req.files.sellerPhoto[0].path;
      }
      if (req.files.sellerSignature) {
        if (plot.sellerSignature && fs.existsSync(plot.sellerSignature)) {
          fs.unlinkSync(plot.sellerSignature);
        }
        updateData.sellerSignature = req.files.sellerSignature[0].path;
      }
    }

    const updatedPlot = await Plot.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('agentId', 'name phone commissionRate')
     .populate('createdBy', 'name username');

    res.json({
      message: 'Plot updated successfully',
      plot: updatedPlot
    });
  } catch (error) {
    // Clean up uploaded files if update fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Delete plot
router.delete('/:id', auth, authorize(['Admin']), async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }

    // Delete associated files
    const filesToDelete = [
      plot.buyerPhoto,
      plot.buyerSignature, 
      plot.sellerPhoto,
      plot.sellerSignature,
      plot.memoPath
    ].filter(Boolean);

    filesToDelete.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Plot.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Plot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF memo with photos and signatures
router.post('/:id/memo', auth, async (req, res) => {
  try {
    const { language = 'english' } = req.body;
    
    const plot = await Plot.findById(req.params.id)
      .populate('agentId', 'name phone commissionRate')
      .populate('createdBy', 'name username');
    
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }

    // Create PDF directory if it doesn't exist
    const pdfDir = path.join(__dirname, '../pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const fileName = `plot_memo_${plot.plotNumber}_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);

    // Create PDF document
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    // Header with company info
    doc.fontSize(20).text('SOMANING KOLI - Samarth Developers Pro Pvt. Ltd.', 50, 50, { align: 'center' });
    doc.fontSize(16).text(language === 'marathi' ? 'प्लॉट विक्री मेमो' : 'PLOT SALE MEMO', 50, 80, { align: 'center' });
    doc.fontSize(10).text('Contact: 8421203314', 50, 100, { align: 'center' });
    
    let yPosition = 140;
    
    // Plot Details
    doc.fontSize(14).text('PLOT DETAILS', 50, yPosition, { underline: true });
    yPosition += 25;
    doc.fontSize(12);
    doc.text(`Plot Number: ${plot.plotNumber}`, 50, yPosition);
    yPosition += 20;
    doc.text(`Location: ${plot.location}, ${plot.village}`, 50, yPosition);
    yPosition += 20;
    doc.text(`Area: ${plot.area}`, 50, yPosition);
    yPosition += 30;

    // Seller Information
    doc.fontSize(14).text('SELLER INFORMATION', 50, yPosition, { underline: true });
    yPosition += 25;
    doc.fontSize(12);
    doc.text(`Name: ${plot.sellerName}`, 70, yPosition);
    yPosition += 15;
    if (plot.sellerPhone) {
      doc.text(`Phone: ${plot.sellerPhone}`, 70, yPosition);
      yPosition += 15;
    }
    if (plot.sellerAddress) {
      doc.text(`Address: ${plot.sellerAddress}`, 70, yPosition);
      yPosition += 15;
    }
    
    // Add seller photo if exists
    if (plot.sellerPhoto && fs.existsSync(plot.sellerPhoto)) {
      try {
        doc.image(plot.sellerPhoto, 400, yPosition - 60, { width: 80, height: 80 });
        doc.fontSize(10).text('Seller Photo', 415, yPosition + 25);
      } catch (err) {
        console.log('Error adding seller photo:', err);
      }
    }
    
    yPosition += 40;

    // Buyer Information
    if (plot.buyerName) {
      doc.fontSize(14).text('BUYER INFORMATION', 50, yPosition, { underline: true });
      yPosition += 25;
      doc.fontSize(12);
      doc.text(`Name: ${plot.buyerName}`, 70, yPosition);
      yPosition += 15;
      if (plot.buyerPhone) {
        doc.text(`Phone: ${plot.buyerPhone}`, 70, yPosition);
        yPosition += 15;
      }
      if (plot.buyerAddress) {
        doc.text(`Address: ${plot.buyerAddress}`, 70, yPosition);
        yPosition += 15;
      }
      
      // Add buyer photo if exists
      if (plot.buyerPhoto && fs.existsSync(plot.buyerPhoto)) {
        try {
          doc.image(plot.buyerPhoto, 400, yPosition - 60, { width: 80, height: 80 });
          doc.fontSize(10).text('Buyer Photo', 415, yPosition + 25);
        } catch (err) {
          console.log('Error adding buyer photo:', err);
        }
      }
      
      yPosition += 40;
    }

    // Financial Details
    doc.fontSize(14).text('FINANCIAL DETAILS', 50, yPosition, { underline: true });
    yPosition += 25;
    doc.fontSize(12);
    doc.text(`Purchase Price: ₹${plot.purchasePrice?.toLocaleString('en-IN')}`, 70, yPosition);
    yPosition += 15;
    if (plot.salePrice > 0) {
      doc.text(`Sale Price: ₹${plot.salePrice.toLocaleString('en-IN')}`, 70, yPosition);
      yPosition += 15;
      const profitLoss = plot.profitLoss;
      const profitLossText = profitLoss >= 0 ? `Profit: ₹${profitLoss.toLocaleString('en-IN')}` : `Loss: ₹${Math.abs(profitLoss).toLocaleString('en-IN')}`;
      doc.text(profitLossText, 70, yPosition);
      yPosition += 15;
    }
    if (plot.paymentMode) {
      doc.text(`Payment Mode: ${plot.paymentMode}`, 70, yPosition);
      yPosition += 15;
    }
    yPosition += 30;

    // Transaction Details
    doc.fontSize(14).text('TRANSACTION DETAILS', 50, yPosition, { underline: true });
    yPosition += 25;
    doc.fontSize(12);
    doc.text(`Date: ${new Date(plot.transactionDate).toLocaleDateString('en-IN')}`, 70, yPosition);
    yPosition += 15;
    doc.text(`Status: ${plot.status}`, 70, yPosition);
    yPosition += 40;

    // Signatures section
    if (yPosition > 600) {
      doc.addPage();
      yPosition = 50;
    }

    doc.fontSize(14).text('SIGNATURES', 50, yPosition, { underline: true });
    yPosition += 30;

    // Seller signature
    doc.fontSize(12).text('Seller Signature:', 50, yPosition);
    if (plot.sellerSignature && fs.existsSync(plot.sellerSignature)) {
      try {
        doc.image(plot.sellerSignature, 50, yPosition + 20, { width: 150, height: 60 });
      } catch (err) {
        doc.text('_________________________', 50, yPosition + 20);
      }
    } else {
      doc.text('_________________________', 50, yPosition + 20);
    }

    // Buyer signature
    doc.fontSize(12).text('Buyer Signature:', 350, yPosition);
    if (plot.buyerSignature && fs.existsSync(plot.buyerSignature)) {
      try {
        doc.image(plot.buyerSignature, 350, yPosition + 20, { width: 150, height: 60 });
      } catch (err) {
        doc.text('_________________________', 350, yPosition + 20);
      }
    } else {
      doc.text('_________________________', 350, yPosition + 20);
    }

    yPosition += 100;
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 50, yPosition);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 350, yPosition);

    // Footer
    yPosition += 50;
    doc.fontSize(10).text('Generated by PropertySuite - SOMANING KOLI', 50, yPosition, { align: 'center' });

    doc.end();

    // Update plot with memo path
    await Plot.findByIdAndUpdate(req.params.id, {
      memoGenerated: true,
      memoPath: filePath
    });

    res.json({
      message: 'PDF memo generated successfully',
      fileName,
      downloadUrl: `/api/plots/${req.params.id}/download-memo`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download memo PDF
router.get('/:id/download-memo', auth, async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot || !plot.memoPath || !fs.existsSync(plot.memoPath)) {
      return res.status(404).json({ error: 'Memo not found' });
    }

    res.download(plot.memoPath, `plot_memo_${plot.plotNumber}.pdf`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const totalPlots = await Plot.countDocuments();
    const soldPlots = await Plot.countDocuments({ status: 'Sold' });
    const availablePlots = await Plot.countDocuments({ status: 'Available' });
    const reservedPlots = await Plot.countDocuments({ status: 'Reserved' });
    
    const revenueData = await Plot.aggregate([
      { $match: { status: 'Sold' } },
      { $group: { _id: null, totalRevenue: { $sum: '$salePrice' } } }
    ]);
    
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    res.json({
      totalPlots,
      soldPlots,
      availablePlots,
      reservedPlots,
      totalRevenue,
      salesRate: totalPlots > 0 ? ((soldPlots / totalPlots) * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;