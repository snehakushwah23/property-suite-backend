const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Mock Client and Document models for no-auth mode
let clients = [
  {
    id: 'CLT001',
    name: 'Rajesh Sharma',
    mobile: '9876543210',
    email: 'rajesh@email.com',
    documentsCount: 5,
    lastUpload: '2024-11-10'
  },
  {
    id: 'CLT002',
    name: 'Priya Patil',
    mobile: '8765432109',
    email: 'priya@email.com',
    documentsCount: 3,
    lastUpload: '2024-11-08'
  },
  {
    id: 'CLT003',
    name: 'Amit Kumar',
    mobile: '7654321098',
    email: 'amit@email.com',
    documentsCount: 7,
    lastUpload: '2024-11-12'
  }
];

let documents = [
  {
    id: 'DOC001',
    clientId: 'CLT001',
    fileName: 'aadhaar_rajesh.pdf',
    originalName: 'Aadhaar Card - Rajesh Sharma.pdf',
    type: 'aadhaar',
    size: '2.3 MB',
    uploadDate: '2024-11-10',
    uploadedBy: 'Admin',
    isSecure: true,
    cloudBackup: true,
    filePath: '/mock/path/aadhaar_rajesh.pdf'
  },
  {
    id: 'DOC002',
    clientId: 'CLT001',
    fileName: 'pan_rajesh.pdf',
    originalName: 'PAN Card - Rajesh Sharma.pdf',
    type: 'pan',
    size: '1.8 MB',
    uploadDate: '2024-11-10',
    uploadedBy: 'Admin',
    isSecure: true,
    cloudBackup: true,
    filePath: '/mock/path/pan_rajesh.pdf'
  }
];

let nextClientId = 4;
let nextDocumentId = 3;

// Create uploads directory structure if it doesn't exist
const createUploadDirs = () => {
  const baseDir = path.join(__dirname, '../uploads/documents');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
};

// Initialize upload directories
createUploadDirs();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const clientId = req.body.clientId || 'temp';
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

// Get all clients - NO AUTH
router.get('/clients', (req, res) => {
  console.log('📁 GET /api/documents/clients called - NO AUTH');
  
  try {
    res.json({
      success: true,
      clients: clients,
      message: `Loaded ${clients.length} clients (NO-AUTH mode)`
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

// Create new client - NO AUTH
router.post('/clients', (req, res) => {
  console.log('➕ POST /api/documents/clients called - NO AUTH');
  console.log('Request body:', req.body);
  
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
    const existingClient = clients.find(client => client.mobile === mobile);
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this mobile number already exists'
      });
    }

    const newClient = {
      id: `CLT${String(nextClientId++).padStart(3, '0')}`,
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim() : undefined,
      documentsCount: 0,
      lastUpload: new Date().toISOString().split('T')[0]
    };

    clients.push(newClient);

    // Create client directory for documents
    const clientDir = path.join(__dirname, '../uploads/documents', newClient.id);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    console.log('✅ Client created successfully:', newClient.id);
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: newClient
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

// Get documents for a specific client - NO AUTH
router.get('/clients/:clientId/documents', (req, res) => {
  console.log(`📄 GET /api/documents/clients/${req.params.clientId}/documents called - NO AUTH`);
  
  try {
    const { clientId } = req.params;
    const { type } = req.query;

    // Validate client exists
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Filter documents by client and type
    let clientDocuments = documents.filter(doc => doc.clientId === clientId);
    
    if (type && type !== 'all') {
      clientDocuments = clientDocuments.filter(doc => doc.type === type);
    }

    res.json({
      success: true,
      documents: clientDocuments,
      count: clientDocuments.length,
      message: `Loaded ${clientDocuments.length} documents for client ${clientId}`
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

// Upload document(s) for a client - NO AUTH
router.post('/clients/:clientId/documents', upload.array('files', 10), (req, res) => {
  console.log(`📤 POST /api/documents/clients/${req.params.clientId}/documents called - NO AUTH`);
  
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
    const client = clients.find(c => c.id === clientId);
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
        const document = {
          id: `DOC${String(nextDocumentId++).padStart(3, '0')}`,
          clientId,
          fileName: file.filename,
          originalName: file.originalname,
          type: documentType || 'other',
          filePath: file.path,
          size: getFileSize(file.size),
          mimeType: file.mimetype,
          uploadDate: new Date().toISOString().split('T')[0],
          uploadedBy: 'Admin',
          isSecure: true, // Default to encrypted for security
          cloudBackup: false // Will be handled separately
        };

        documents.push(document);
        uploadedDocuments.push(document);

      } catch (fileError) {
        console.error('Error processing file:', file.originalname, fileError);
        // Continue processing other files
      }
    }

    // Update client's document count
    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
      clients[clientIndex].documentsCount += uploadedDocuments.length;
      clients[clientIndex].lastUpload = new Date().toISOString().split('T')[0];
    }

    console.log(`✅ ${uploadedDocuments.length} documents uploaded successfully for client ${clientId}`);
    res.status(201).json({
      success: true,
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
      documents: uploadedDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        type: doc.type,
        size: doc.size,
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

// Download document - NO AUTH
router.get('/documents/:documentId/download', (req, res) => {
  console.log(`⬇️ GET /api/documents/documents/${req.params.documentId}/download called - NO AUTH`);
  
  try {
    const { documentId } = req.params;

    const document = documents.find(doc => doc.id === documentId);
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

// View document (for preview) - NO AUTH
router.get('/documents/:documentId/view', (req, res) => {
  console.log(`👁️ GET /api/documents/documents/${req.params.documentId}/view called - NO AUTH`);
  
  try {
    const { documentId } = req.params;

    const document = documents.find(doc => doc.id === documentId);
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

// Delete document - NO AUTH
router.delete('/documents/:documentId', (req, res) => {
  console.log(`🗑️ DELETE /api/documents/documents/${req.params.documentId} called - NO AUTH`);
  
  try {
    const { documentId } = req.params;

    const documentIndex = documents.findIndex(doc => doc.id === documentId);
    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documents[documentIndex];

    // Delete physical file if it exists
    if (fs.existsSync(document.filePath)) {
      try {
        fs.unlinkSync(document.filePath);
      } catch (fileError) {
        console.log('File deletion failed:', fileError.message);
      }
    }

    // Remove document from array
    documents.splice(documentIndex, 1);

    // Update client's document count
    const clientIndex = clients.findIndex(c => c.id === document.clientId);
    if (clientIndex !== -1) {
      clients[clientIndex].documentsCount = Math.max(0, clients[clientIndex].documentsCount - 1);
    }

    console.log('✅ Document deleted successfully:', documentId);
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

// Get document vault statistics - NO AUTH
router.get('/stats', (req, res) => {
  console.log('📊 GET /api/documents/stats called - NO AUTH');
  
  try {
    const totalClients = clients.length;
    const totalDocuments = documents.length;
    
    // Documents this month (mock calculation)
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const documentsThisMonth = documents.filter(doc => {
      const uploadDate = new Date(doc.uploadDate);
      return uploadDate.getMonth() === thisMonth && uploadDate.getFullYear() === thisYear;
    }).length;

    // Document type distribution
    const typeDistribution = documents.reduce((acc, doc) => {
      const existingType = acc.find(item => item._id === doc.type);
      if (existingType) {
        existingType.count++;
      } else {
        acc.push({ _id: doc.type, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      stats: {
        totalClients,
        totalDocuments,
        documentsThisMonth,
        totalFiles: totalDocuments,
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