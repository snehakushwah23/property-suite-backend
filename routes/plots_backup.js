const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const Plot = require('../models/Plot');
const Agent = require('../models/Agent');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/plots');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'buyerPhoto' || file.fieldname === 'sellerPhoto') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for photos'));
      }
    } else if (file.fieldname === 'buyerSignature' || file.fieldname === 'sellerSignature') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for signatures'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// Get all plots
router.get('/', auth, (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT p.*, u.name as created_by_name 
    FROM plots p 
    LEFT JOIN users u ON p.created_by = u.id 
    WHERE 1=1
  `;
  
  const params = [];
  
  if (search) {
    query += ` AND (p.plot_number LIKE ? OR p.buyer_name LIKE ? OR p.seller_name LIKE ? OR p.village LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }
  
  if (status) {
    query += ` AND p.status = ?`;
    params.push(status);
  }
  
  query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM plots WHERE 1=1`;
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (plot_number LIKE ? OR buyer_name LIKE ? OR seller_name LIKE ? OR village LIKE ?)`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    
    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        plots: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countRow.total / limit),
          totalItems: countRow.total,
          itemsPerPage: parseInt(limit)
        }
      });
    });
  });
});

// Get single plot
router.get('/:id', auth, (req, res) => {
  const query = `
    SELECT p.*, u.name as created_by_name 
    FROM plots p 
    LEFT JOIN users u ON p.created_by = u.id 
    WHERE p.id = ?
  `;
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    res.json(row);
  });
});

// Create new plot
router.post('/', auth, upload.fields([
  { name: 'buyerPhoto', maxCount: 1 },
  { name: 'buyerSignature', maxCount: 1 },
  { name: 'sellerPhoto', maxCount: 1 },
  { name: 'sellerSignature', maxCount: 1 }
]), (req, res) => {
  const {
    plotNumber,
    buyerName,
    buyerPhone,
    buyerEmail,
    buyerAddress,
    sellerName,
    sellerPhone,
    sellerEmail,
    sellerAddress,
    village,
    area,
    location,
    purchasePrice,
    salePrice = 0,
    paymentMode,
    transactionDate,
    status = 'Available',
    gstApplicable = false
  } = req.body;

  // Calculate profit/loss
  const profitLoss = parseFloat(salePrice) - parseFloat(purchasePrice);
  
  // Calculate GST if applicable
  const gstAmount = gstApplicable ? (parseFloat(salePrice) * 0.18) : 0;
  
  // Handle file uploads
  const buyerPhoto = req.files?.buyerPhoto?.[0]?.filename || null;
  const buyerSignature = req.files?.buyerSignature?.[0]?.filename || null;
  const sellerPhoto = req.files?.sellerPhoto?.[0]?.filename || null;
  const sellerSignature = req.files?.sellerSignature?.[0]?.filename || null;

  const query = `
    INSERT INTO plots (
      plot_number, buyer_name, buyer_phone, buyer_email, buyer_address, buyer_photo, buyer_signature,
      seller_name, seller_phone, seller_email, seller_address, seller_photo, seller_signature,
      village, area, location, purchase_price, sale_price, profit_loss,
      payment_mode, transaction_date, status, gst_applicable, gst_amount, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    plotNumber, buyerName, buyerPhone, buyerEmail, buyerAddress, buyerPhoto, buyerSignature,
    sellerName, sellerPhone, sellerEmail, sellerAddress, sellerPhoto, sellerSignature,
    village, area, location, parseFloat(purchasePrice), parseFloat(salePrice), profitLoss,
    paymentMode, transactionDate, status, gstApplicable ? 1 : 0, gstAmount, req.user.id
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const plotId = this.lastID;
    
    // Generate memo if it's a sale
    if (status === 'Sold' && parseFloat(salePrice) > 0) {
      generatePlotMemo(plotId, (memoErr, memoPath) => {
        if (memoErr) {
          console.error('Error generating memo:', memoErr);
        } else {
          // Update plot with memo path
          db.run(
            'UPDATE plots SET memo_generated = 1, memo_path = ? WHERE id = ?',
            [memoPath, plotId]
          );
        }
      });
    }
    
    res.status(201).json({
      message: 'Plot created successfully',
      plotId: plotId,
      profitLoss: profitLoss
    });
  });
});

// Update plot
router.put('/:id', auth, upload.fields([
  { name: 'buyerPhoto', maxCount: 1 },
  { name: 'buyerSignature', maxCount: 1 },
  { name: 'sellerPhoto', maxCount: 1 },
  { name: 'sellerSignature', maxCount: 1 }
]), (req, res) => {
  const plotId = req.params.id;
  const {
    buyerName,
    buyerPhone,
    buyerEmail,
    buyerAddress,
    sellerName,
    sellerPhone,
    sellerEmail,
    sellerAddress,
    village,
    area,
    location,
    purchasePrice,
    salePrice,
    paymentMode,
    transactionDate,
    status,
    gstApplicable
  } = req.body;

  // Calculate profit/loss
  const profitLoss = parseFloat(salePrice || 0) - parseFloat(purchasePrice);
  
  // Calculate GST if applicable
  const gstAmount = gstApplicable ? (parseFloat(salePrice || 0) * 0.18) : 0;
  
  // Handle file uploads
  const updateFields = [];
  const updateParams = [];
  
  const fields = {
    buyer_name: buyerName,
    buyer_phone: buyerPhone,
    buyer_email: buyerEmail,
    buyer_address: buyerAddress,
    seller_name: sellerName,
    seller_phone: sellerPhone,
    seller_email: sellerEmail,
    seller_address: sellerAddress,
    village: village,
    area: area,
    location: location,
    purchase_price: parseFloat(purchasePrice),
    sale_price: parseFloat(salePrice || 0),
    profit_loss: profitLoss,
    payment_mode: paymentMode,
    transaction_date: transactionDate,
    status: status,
    gst_applicable: gstApplicable ? 1 : 0,
    gst_amount: gstAmount,
    updated_at: new Date().toISOString()
  };
  
  // Add file fields if uploaded
  if (req.files?.buyerPhoto?.[0]) {
    fields.buyer_photo = req.files.buyerPhoto[0].filename;
  }
  if (req.files?.buyerSignature?.[0]) {
    fields.buyer_signature = req.files.buyerSignature[0].filename;
  }
  if (req.files?.sellerPhoto?.[0]) {
    fields.seller_photo = req.files.sellerPhoto[0].filename;
  }
  if (req.files?.sellerSignature?.[0]) {
    fields.seller_signature = req.files.sellerSignature[0].filename;
  }
  
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      updateFields.push(`${key} = ?`);
      updateParams.push(value);
    }
  });
  
  updateParams.push(plotId);
  
  const query = `UPDATE plots SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, updateParams, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Generate memo if status changed to Sold
    if (status === 'Sold' && parseFloat(salePrice || 0) > 0) {
      generatePlotMemo(plotId, (memoErr, memoPath) => {
        if (memoErr) {
          console.error('Error generating memo:', memoErr);
        } else {
          db.run(
            'UPDATE plots SET memo_generated = 1, memo_path = ? WHERE id = ?',
            [memoPath, plotId]
          );
        }
      });
    }
    
    res.json({
      message: 'Plot updated successfully',
      profitLoss: profitLoss
    });
  });
});

// Delete plot
router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM plots WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    res.json({ message: 'Plot deleted successfully' });
  });
});

// Generate Plot Memo PDF
router.get('/:id/memo', auth, (req, res) => {
  const plotId = req.params.id;
  
  db.get('SELECT * FROM plots WHERE id = ?', [plotId], (err, plot) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    generatePlotMemo(plotId, (err, memoPath) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to generate memo' });
      }
      
      const fullPath = path.join(__dirname, '../uploads/memos', memoPath);
      res.download(fullPath, `Plot_${plot.plot_number}_Memo.pdf`);
    });
  });
});

// Function to generate Plot Memo PDF
function generatePlotMemo(plotId, callback) {
  db.get('SELECT * FROM plots WHERE id = ?', [plotId], (err, plot) => {
    if (err) {
      return callback(err);
    }
    if (!plot) {
      return callback(new Error('Plot not found'));
    }
    
    const memosDir = path.join(__dirname, '../uploads/memos');
    if (!fs.existsSync(memosDir)) {
      fs.mkdirSync(memosDir, { recursive: true });
    }
    
    const memoFileName = `plot_${plot.plot_number}_memo_${Date.now()}.pdf`;
    const memoPath = path.join(memosDir, memoFileName);
    
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(memoPath));
    
    // Header
    doc.fontSize(20).text('SOMANING KOLI – Samarth Developers Pro Pvt. Ltd.', { align: 'center' });
    doc.fontSize(12).text('Mahasul Colony, Near PWD Quarters, Jat – 416404', { align: 'center' });
    doc.text('GSTIN: 27DNJPK9124G1ZR | Phone: 8421203314', { align: 'center' });
    doc.moveDown();
    
    // Title
    doc.fontSize(16).text(`${plot.status === 'Sold' ? 'प्लॉट विक्री मेमो / Plot Sale Memo' : 'प्लॉट खरेदी मेमो / Plot Purchase Memo'}`, { align: 'center' });
    doc.moveDown();
    
    // Plot Details
    doc.fontSize(12);
    doc.text(`Plot Number / प्लॉट नंबर: ${plot.plot_number}`, { continued: true });
    doc.text(`Date / दिनांक: ${new Date(plot.transaction_date).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    
    // Seller Details
    doc.text('विक्रेता तपशील / Seller Details:', { underline: true });
    doc.text(`Name / नाव: ${plot.seller_name}`);
    if (plot.seller_phone) doc.text(`Phone / फोन: ${plot.seller_phone}`);
    if (plot.seller_address) doc.text(`Address / पत्ता: ${plot.seller_address}`);
    doc.moveDown();
    
    // Buyer Details (if sold)
    if (plot.buyer_name) {
      doc.text('खरेदीदार तपशील / Buyer Details:', { underline: true });
      doc.text(`Name / नाव: ${plot.buyer_name}`);
      if (plot.buyer_phone) doc.text(`Phone / फोन: ${plot.buyer_phone}`);
      if (plot.buyer_address) doc.text(`Address / पत्ता: ${plot.buyer_address}`);
      doc.moveDown();
    }
    
    // Property Details
    doc.text('मालमत्ता तपशील / Property Details:', { underline: true });
    doc.text(`Village / गाव: ${plot.village}`);
    doc.text(`Area / क्षेत्रफळ: ${plot.area}`);
    doc.text(`Location / स्थान: ${plot.location}`);
    doc.moveDown();
    
    // Financial Details
    doc.text('आर्थिक तपशील / Financial Details:', { underline: true });
    doc.text(`Purchase Price / खरेदी किंमत: ₹${plot.purchase_price.toLocaleString()}`);
    if (plot.sale_price > 0) {
      doc.text(`Sale Price / विक्री किंमत: ₹${plot.sale_price.toLocaleString()}`);
      doc.text(`Profit/Loss / नफा/तोटा: ₹${plot.profit_loss.toLocaleString()}`, {
        fillColor: plot.profit_loss >= 0 ? 'green' : 'red'
      });
    }
    if (plot.gst_applicable && plot.gst_amount > 0) {
      doc.fillColor('black').text(`GST (18%): ₹${plot.gst_amount.toLocaleString()}`);
    }
    doc.text(`Payment Mode / पेमेंट पद्धती: ${plot.payment_mode}`);
    doc.moveDown();
    
    // Signature section
    doc.moveDown(2);
    doc.text('स्वाक्षरी / Signatures:');
    doc.moveDown();
    
    // Create two columns for signatures
    const leftX = 70;
    const rightX = 350;
    const signatureY = doc.y;
    
    doc.text('विक्रेता स्वाक्षरी', leftX, signatureY);
    doc.text('Seller Signature', leftX, signatureY + 15);
    doc.moveTo(leftX, signatureY + 50).lineTo(leftX + 150, signatureY + 50).stroke();
    
    if (plot.buyer_name) {
      doc.text('खरेदीदार स्वाक्षरी', rightX, signatureY);
      doc.text('Buyer Signature', rightX, signatureY + 15);
      doc.moveTo(rightX, signatureY + 50).lineTo(rightX + 150, signatureY + 50).stroke();
    }
    
    // Footer
    doc.moveDown(3);
    doc.fontSize(10).text('यह एक कंप्यूटर जनरेटेड मेमो है / This is a computer generated memo', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.end();
    
    doc.on('end', () => {
      callback(null, memoFileName);
    });
    
    doc.on('error', (err) => {
      callback(err);
    });
  });
}

module.exports = router;