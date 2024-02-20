const AppError = require('../utils/appError');

const sendErrorDev = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        // For API
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err,
        });
    } else {
        console.log(err.message);
        // FOR rendered website
        res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: err.message,
        });
    }
};

const handleJwtError = () =>
    new AppError(`Invalid token. please log in again`, 401);

const handleTokenExpire = () =>
    new AppError(`your token has expired. Please log in again`, 401);

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const message = `Duplicate Field Value : "${err.keyValue.name}", Please use another value.`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);

    const message = `Invalid input data. ${errors.join('. ')} `;
    return new AppError(message, 400);
};

const sendErrorProd = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        // For API
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        }
        // Programming or other unknown error : don't leak error details
        // 1) Log Error
        console.error('ERROR : ', err);
        // 2) Send generic error to client
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong!',
        });
    }
    // For RENDERED WEBSITE
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: err.message,
        });
    }
    // Programming or other unknown error : don't leak error details
    // 1) Log Error
    console.error('ERROR : ', err);
    // 2) Send generic error to client
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: 'Please try again later',
    });
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;
        if (err.name === 'CastError') error = handleCastErrorDB(error);
        else if (err.code === 11000) error = handleDuplicateFieldsDB(error);
        else if (err.name === 'ValidationError')
            error = handleValidationErrorDB(error);
        else if (err.name === 'JsonWebTokenError') error = handleJwtError();
        else if (err.name === 'TokenExpiredError') error = handleTokenExpire();
        sendErrorProd(error, req, res);
    }
};
