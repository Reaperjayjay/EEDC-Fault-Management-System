const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const siteRouter = require('./routes/siteRoutes');
const engineerRouter = require('./routes/engineerRoutes');
const faultRouter = require('./routes/faultRoutes');
const assignmentRouter = require('./routes/assignmentRoutes');
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const performanceReviewRouter = require('./routes/performanceReviewRoutes');
const assignmentUpdateRouter = require('./routes/assignmentUpdateRoutes');
const dashboardRouter = require('./routes/dashboardRoutes');

const app = express();
///set security http
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP. please try again in an hour!',
});

app.use('/api', limiter);

app.use(express.json({ limit: '10kb' }));
///Data santizatin against sql injection

///Data santization against XSS
app.use(xss());
///preventing parameter middleware
app.use(hpp());
/*
// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

*/
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  console.log('hello from the middleware world😁');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers);
  next();
});

//ROUTES ENGINEER

app.use('/api/v1/sites', siteRouter);
app.use('/api/v1/engineers', engineerRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/faults', faultRouter);
app.use('/api/v1/assignments', assignmentRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/performance-reviews', performanceReviewRouter);
app.use('/api/v1/assignment-updates', assignmentUpdateRouter);

app.use('/api/v1/dashboard', dashboardRouter);
////for site with wrong url
app.all('*', (req, res, next) => {
  //const err = new Error(`can't find ${req.originalUrl} on this server!`);
  /// err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`can't find ${req.originalUrl} on this server!`, 404));
});

//////errro hanling
app.use(globalErrorHandler);

module.exports = app;
