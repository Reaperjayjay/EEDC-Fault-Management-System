const fs = require('fs');
const Site = require('../../models/sitesModel');

const sites = JSON.parse(
  fs.readFileSync(`${__dirname}/sites-simple.json`, 'utf-8'),
);

// IMPORT DATA
const importData = async () => {
  try {
    await sites.reduce(
      (promise, site) => promise.then(() => Site.create(site)),
      Promise.resolve(),
    );

    console.log('DATA IS SUCCESSFULLY UPLOADED ✅');
  } catch (err) {
    console.error('DATA IMPORT FAILED ❌');
    console.error(err);
  }

  process.exit();
};

// DELETE DATA
const deleteData = async () => {
  try {
    await Site.deleteAll();
    console.log('DATA SUCCESSFULLY DELETED ✅');
    process.exit();
  } catch (err) {
    console.error('DATA DELETE FAILED ❌');
    console.error(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
}

if (process.argv[2] === '--delete') {
  deleteData();
}
