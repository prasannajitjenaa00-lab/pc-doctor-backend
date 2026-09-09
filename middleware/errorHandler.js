const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error(`[Server Error] Path: ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err);

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, `Invalid resource ID format for '${err.path}'`);
  }

  // Mongoose Duplicate Key Error (e.g. unique barcode, invoiceNumber)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return ApiResponse.badRequest(
      res,
      `A record with ${field} '${value}' already exists. Please use a unique value.`
    );
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return ApiResponse.badRequest(res, 'Validation Failed', errors);
  }

  // Multer File Upload Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.badRequest(res, 'File size too large. Maximum allowed size is 5MB.');
    }
    return ApiResponse.badRequest(res, `Upload error: ${err.message}`);
  }

  // Fallback Generic Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return ApiResponse.error(res, message, statusCode);
};

module.exports = errorHandler;
