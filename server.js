const db = require('./db');
const Site = require('./models/sitesModel');
const User = require('./models/userModel');
const app = require('./app');
const Engineer = require('./models/engineersModel');
const Fault = require('./models/faultsModel');
const Assignment = require('./models/assignmentsModel');
const performanceReview = require('./models/performanceReviewModel');
const AssignmentUpdate = require('./models/assignmentUpdatesModel');
const CustomerNotification = require('./models/customerNotificationsModel');
const AssignmentCheckin = require('./models/assignmentCheckinModel');
const EngineerLocation = require('./models/engineerLocationModel');

const OutageAnnouncement = require('./models/outageAnnouncementsModel');

const SupportRequest = require('./models/supportRequestsModel');

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

CustomerNotification.createTable()
  .then(() => {
    console.log('CUSTOMER NOTIFICATIONS TABLE READY');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE CUSTOMER NOTIFICATIONS TABLE');
    console.error(err.message);
  });

OutageAnnouncement.createTable()
  .then(() => {
    console.log('OUTAGE ANNOUNCEMENTS TABLE READY');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE OUTAGE ANNOUNCEMENTS TABLE');
    console.error(err.message);
  });

SupportRequest.createTable()
  .then(() => {
    console.log('SUPPORT REQUESTS TABLE READY');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE SUPPORT REQUESTS TABLE');
    console.error(err.message);
  });

AssignmentCheckin.createTable()
  .then(() => {
    console.log('ASSIGNMENT CHECKINS TABLE READY');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE ASSIGNMENT CHECKINS TABLE');
    console.error(err.message);
  });

EngineerLocation.createTable()
  .then(() => {
    console.log('ENGINEER LOCATIONS TABLE READY');
  })
  .catch((err) => {
    console.error('FAILED TO CREATE ENGINEER LOCATIONS TABLE');
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
