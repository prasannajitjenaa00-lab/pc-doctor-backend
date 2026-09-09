const ApiResponse = require('../utils/apiResponse');

/**
 * Handle Single File Upload
 */
exports.uploadSingle = (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file was uploaded');
  }

  // Construct accessible URL
  const fileUrl = `/uploads/${req.file.filename}`;

  return ApiResponse.success(res, {
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  }, 'File uploaded successfully');
};

/**
 * Handle Multiple Files Upload (for device condition inspection photos)
 */
exports.uploadMultiple = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return ApiResponse.badRequest(res, 'No files were uploaded');
  }

  const fileData = req.files.map(file => ({
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size
  }));

  return ApiResponse.success(res, fileData, `${req.files.length} files uploaded successfully`);
};
