const AppError = require('../utils/appError');

const handleCastErrorDb = (err) => {
  console.error('Error in database', err);
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDb = (err) => {
  console.error('Error in database', err);
  const value = err.errorResponse.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}, Please use another value`;
  return new AppError(message, 409);
};
const handleValidationErrorDb = (err) => {
  const errors = Object.values(err.errors).map((value) => value.message);
  console.error('Error in database', err);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token, Please login in again', 401);

const handleJWTExpiresError = () =>
  new AppError('Your token has expired! Please log in again', 401);

const developmentError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const productionError = (err, res) => {
  //Operational or known error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    //Programming or other error unknown error: don't sent message(create a generic one)
    // 1) Log error
    console.error('Error:', err);

    //2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!, Please contact admin',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    developmentError(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err};
    error.message = err.message; 
    
    if (error.name === 'CastError') error = handleCastErrorDb(error);
    if (error.code === 11000) error = handleDuplicateFieldsDb(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDb(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiresError();

    productionError(error, res);
  }
};
