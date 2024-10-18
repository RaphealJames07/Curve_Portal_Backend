/* eslint-disable prettier/prettier */
// 1) REQUIRE TOP LEVEL MODULES
const express = require('express');
const cors = require("cors");
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const dotenv = require('dotenv');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();
dotenv.config({ path: './config.env' });
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"], // Add the allowed methods here
  })
);

const userRouter = require('./routes/userRoutes');

// 2) DEFINE MIDDLEWARES

// Set security HTTP Headers
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limiting request from same IP address
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests, please try again in an hour.',
});

app.use('/api', limiter);

//Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Serving static files
app.use(express.static(`${__dirname}/public`));

// Test middlewares
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});


app.use('/api/v1/users', userRouter);

app.get("/", (req, res) => {
  res.send(`Welcome to curve-portal-backend server! mode ${process.env.NODE_ENV}`);
});

// Handle Unhandled ROutes
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server`,
  // });
  // const err = new Error(`Can not find ${req.originalUrl} endpoint on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(
    new AppError(
      `Can not find ${req.originalUrl} endpoint on this server`,
      404,
    ),
  );
});



app.use(globalErrorHandler);

// 5) STARITING UP SERVER

module.exports = app;
