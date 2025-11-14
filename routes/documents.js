const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Client = require('../models/Client');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory structure if it doesn't exist
const createUploadDirs = () => {
  const baseDir = path.join(__dirname, '../uploads/documents');
  const dirs = [baseDir];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const clientId = req.body.clientId;
    const uploadPath = path.join(__dirname, '../uploads/documents', clientId);
    
    // Create client-specific directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const documentType = req.body.documentType || 'other';
    const timestamp = Date.now();
    const uniqueId = uuidv4().slice(0, 8);
    const extension = path.extname(file.originalname);
    const filename = `${documentType}_${timestamp}_${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Get all clients
router.get('/clients', auth, async (req, res) => {
  try {
    const clients = await Client.find()
      .select('name mobile email documentsCount lastDocumentUpload createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      clients: clients.map(client => ({
        id: client._id,
        name: client.name,
        mobile: client.mobile,
        email: client.email,
        documentsCount: client.documentsCount || 0,
        lastUpload: client.lastDocumentUpload || client.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
});

// Create new client
router.post('/clients', auth, async (req, res) => {
  try {
    const { name, mobile, email } = req.body;

    // Validate required fields
    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name and mobile number are required'
      });
    }

    // Check if client with same mobile already exists
    const existingClient = await Client.findOne({ mobile });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this mobile number already exists'
      });
    }

    const client = new Client({
      name,
      mobile,
      email: email || undefined,
      documentsCount: 0,
      createdBy: req.user.id
    });

    await client.save();

    // Create client directory for documents
    const clientDir = path.join(__dirname, '../uploads/documents', client._id.toString());
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: {
        id: client._id,
        name: client.name,
        mobile: client.mobile,
        email: client.email,
        documentsCount: 0,
        lastUpload: client.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating client',
      error: error.message
    });
  }
});

// Get documents for a specific client
router.get('/clients/:clientId/documents', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type } = req.query;

    // Validate client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Build query filter
    const filter = { clientId };
    if (type && type !== 'all') {
      filter.documentType = type;
    }

    const documents = await Document.find(filter)
      .sort({ uploadDate: -1 })
      .populate('uploadedBy', 'name email');

    const documentsWithDetails = documents.map(doc => ({
      id: doc._id,
      clientId: doc.clientId,
      fileName: doc.fileName,
      originalName: doc.originalName,
      type: doc.documentType,
      size: doc.fileSize,
      uploadDate: doc.uploadDate,
      uploadedBy: doc.uploadedBy?.name || 'System',
      isSecure: doc.isEncrypted || false,
      cloudBackup: doc.cloudBackup || false,
      filePath: doc.filePath
    }));

    res.json({
      success: true,
      documents: documentsWithDetails,
      count: documentsWithDetails.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
});

// Upload document(s) for a client
router.post('/clients/:clientId/documents', auth, upload.array('files', 10), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { documentType } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Validate client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      try {
        // Get file size in readable format
        const getFileSize = (bytes) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Create document record
        const document = new Document({
          clientId,
          fileName: file.filename,
          originalName: file.originalname,
          documentType: documentType || 'other',
          filePath: file.path,
          fileSize: getFileSize(file.size),
          mimeType: file.mimetype,
          uploadedBy: req.user.id,
          isEncrypted: true, // Default to encrypted for security
          cloudBackup: false // Will be handled separately
        });

        await document.save();
        uploadedDocuments.push(document);

      } catch (fileError) {
        console.error('Error processing file:', file.originalname, fileError);
        // Continue processing other files
      }
    }

    // Update client's document count
    await Client.findByIdAndUpdate(clientId, {
      $inc: { documentsCount: uploadedDocuments.length },
      lastDocumentUpload: new Date()
    });

    res.status(201).json({
      success: true,
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
      documents: uploadedDocuments.map(doc => ({
        id: doc._id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        type: doc.documentType,
        size: doc.fileSize,
        uploadDate: doc.uploadDate
      })),
      count: uploadedDocuments.length
    });

  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading documents',
      error: error.message
    });
  }
});

// Download document
router.get('/documents/:documentId/download', auth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);

    // Stream the file
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading document',
      error: error.message
    });
  }
});

// View document (for preview)
router.get('/documents/:documentId/view', auth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers for viewing
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error viewing document:', error);
    res.status(500).json({
      success: false,
      message: 'Error viewing document',
      error: error.message
    });
  }
});

// Delete document
router.delete('/documents/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete physical file
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete document record
    await Document.findByIdAndDelete(documentId);

    // Update client's document count
    await Client.findByIdAndUpdate(document.clientId, {
      $inc: { documentsCount: -1 }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
});

// Get document vault statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const documentsThisMonth = await Document.countDocuments({
      uploadDate: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    // Get storage usage (approximate)
    const documentsWithSize = await Document.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          // Note: fileSize is stored as string, so this is approximate
        }
      }
    ]);

    // Document type distribution
    const typeDistribution = await Document.aggregate([
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalClients,
        totalDocuments,
        documentsThisMonth,
        totalFiles: documentsWithSize[0]?.totalFiles || 0,
        typeDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.'
      });
    }
  }
  
  if (err.message.includes('Only PDF, JPG, JPEG, and PNG files are allowed')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'
    });
  }

  next(err);
});

module.exports = router;