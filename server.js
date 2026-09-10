const db = require('./db');
const Site = require('./models/sitesModel');
const User = require('./models/userModel');
const app = require('./app');
const Engineer = require('./models/engineersModel');
const Fault = require('./models/faultsModel');
const Assignment = require('./models/assignmentsModel');
const performanceReview = require('./models/performanceReviewModel');
const AssignmentUpdate = require('./models/assignmentUpdatesModel');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION ⚡ SHUTTING DOWN');
  console.error(err);
  process.exit(1);
});

Site.createTable()
  .then(() => {
    console.log('SITES TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE SITES TABLE ❌');
    console.error(err.message);
  });

User.createTable()
  .then(() => {
    console.log('USERS TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE USERS TABLE ❌');
    console.error(err.message);
  });

Engineer.createTable()
  .then(() => {
    console.log('Engineer TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE Engineer TABLE ❌');
    console.error(err.message);
  });

Fault.createTable()
  .then(() => {
    console.log('Fault TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE Engineer TABLE ❌');
    console.error(err.message);
  });

Assignment.createTable()
  .then(() => {
    console.log('Assignment TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE Engineer TABLE ❌');
    console.error(err.message);
  });

performanceReview
  .createTable()
  .then(() => {
    console.log('Performance TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE Engineer TABLE ❌');
    console.error(err.message);
  });

AssignmentUpdate.createTable()
  .then(() => {
    console.log('AssignmentUpdate TABLE READY ✅');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE Engineer TABLE ❌');
    console.error(err.message);
  });

db.getConnection()
  .then((connection) => {
    console.log('DATABASE CONNECTED SUCCESSFULLY ✅');
    connection.release();
  })
  .catch((err) => {
    console.error('DATABASE CONNECTION FAILED ❌');
    console.error(err.message);
  });

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`APP IS RUNNING ON ${port}`);
});
