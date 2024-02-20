const express = require('express');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

// Starting express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// ---------GLOBAL MIDDLEWARES --------------
// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// set security HTTP headers
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'", 'data:', 'blob:'],

                fontSrc: ["'self'", 'https:', 'data:'],

                //scriptSrc: ["'self'", 'unsafe-inline'],

                scriptSrc: ["'self'", 'https://*.cloudflare.com'],

                scriptSrcElem: ["'self'", 'https:', 'https://*.cloudflare.com'],

                styleSrc: ["'self'", 'https:', 'unsafe-inline'],

                connectSrc: ["'self'", 'data', 'https://*.cloudflare.com'],
            },
        }),
    );
}

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Limit requests from same IP ( prevent DOS attacks )
const limiter = rateLimit({
    max: 100,
    windowMs: 1 * 60 * 60 * 1000,
    message: 'Too many requests from this IP, Please try again after 1hr',
});
app.use('/api', limiter);

// Body parser, reading data from body to req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS (cross site scripting attacks)
app.use(xss());

// Prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsAverage',
            'ratingsQuantity',
            'name',
            'maxGroupSize',
            'difficulty',
            'price',
            'durationWeeks',
        ],
    }),
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    // console.log(req.cookies);
    next();
});

// --------- ROUTES --------------
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// undefine routes handling
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'Fail',
    //     message: `Can't find ${req.originalUrl} on this server!`,
    // });
    const err = new AppError(
        `Can't find ${req.originalUrl} on this server!`,
        404,
    );
    next(err);
});

// Error handling middleware
app.use(globalErrorHandler);

module.exports = app;
