/* eslint-disable prettier/prettier */
// 1) REQUIRE TOP LEVEL MODULES
const express = require('express');
const cors = require("cors");
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const dotenv = require('dotenv');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();
dotenv.config({ path: './config.env' });
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"], // Add the allowed methods here
  })
);

const userRouter = require('./routes/userRoutes');
const cohortRouter = require('./routes/cohortRoutes');
const studentRouter = require('./routes/studentRoutes');
const schemeRouter = require('./routes/schemeRoutes');
const attendanceRouter = require('./routes/attendanceRoutes');

// 2) DEFINE MIDDLEWARES

// Set security HTTP Headers
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


//Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);


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
app.use('/api/v1/cohort', cohortRouter);
app.use('/api/v1/student', studentRouter);
app.use('/api/v1/scheme', schemeRouter);
app.use('/api/v1/attendance', attendanceRouter);

app.get("/", (req, res) => {
  res.send(`Welcome to curve-portal-backend server! you are on ${process.env.NODE_ENV} mode`);
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
