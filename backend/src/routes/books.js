const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/uploadController');
const bookController = require('../controllers/bookController');

const upload = require('../middleware/upload');

// Важно объявить их ДО route.get('/:id'), иначе /status/:id может попасть под маску :id
router.post('/upload', uploadController.uploadImage);
router.post('/create', uploadController.createBook);
router.get('/status/:jobId', uploadController.getJobStatus);

router.get('/', bookController.getAllBooks);
router.get('/:id', bookController.getBook);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

// router.get('/:id/history', bookController.getBookHistory);

module.exports = router;