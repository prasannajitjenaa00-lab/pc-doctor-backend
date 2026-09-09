const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

// POST /api/upload/single - upload one image (logo or receipt)
router.post('/single', upload.single('image'), uploadController.uploadSingle);

// POST /api/upload/multiple - upload up to 10 device inspection photos
router.post('/multiple', upload.array('photos', 10), uploadController.uploadMultiple);

module.exports = router;
