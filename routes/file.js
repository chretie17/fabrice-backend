
// 3. Create routes/fileUpload.js
const express = require('express');
const router = express.Router();
const path = require('path');  // This is what was missing
const fs = require('fs');
const upload = require('./upload');
const fileController = require('../controllers/FileUploadController');

router.post('/submit', upload.single('file'), fileController.submitAssignment);
router.get('/student/:student_id/assignment/:assignment_id', fileController.getStudentSubmission);
router.get('/assignment/:assignment_id/submissions', fileController.getAssignmentSubmissions);
router.get('/download/:filename', fileController.downloadFile);
// Add this route to your backend routes file (e.g., fileRoutes.js)

// GET /api/files/view/:filename - View file inline (no download)
router.get('/view/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Get file extension and set appropriate MIME type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.zip': 'application/zip'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  // Set headers for inline viewing (not download)
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', 'inline'); // This makes it view instead of download
  
  // For security, you might want to add these headers too:
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Send the file
  res.sendFile(path.resolve(filePath));
});

// Keep your existing download route for fallback
// GET /api/files/download/:filename - Download file
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set appropriate headers based on file type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.zip': 'application/zip'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  // Force download with attachment disposition
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
  
  res.sendFile(path.resolve(filePath));
});

// OPTIONAL: Enhanced view route with file type detection
router.get('/view/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const ext = path.extname(filename).toLowerCase();
  
  // Define viewable file types
  const viewableTypes = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    
    // Documents that can be viewed in browser
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.xml': 'text/xml',
    
    // JSON files
    '.json': 'application/json'
  };
  
  const mimeType = viewableTypes[ext];
  
  if (!mimeType) {
    // File type not supported for viewing, return error or fallback to download
    return res.status(400).json({ 
      error: 'File type not supported for inline viewing',
      downloadUrl: `/api/files/download/${filename}`
    });
  }
  
  // Set headers for inline viewing
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  // Send the file
  res.sendFile(path.resolve(filePath));
});

module.exports = router;