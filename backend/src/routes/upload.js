const express = require('express');
const router = express.Router();
const { upload, handleUploadError } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

router.post('/upload', 
  upload.single('image'),
  handleUploadError,
  uploadController.uploadImage
);

router.post('/create', uploadController.createBook);

router.get('/upload/status/:bookId', uploadController.getProcessingStatus);

router.get('/:id/processed', uploadController.getProcessedBook);

module.exports = router;