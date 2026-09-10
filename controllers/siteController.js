const Site = require('../models/sitesModel');
const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.GetAllSite = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(Site, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  console.log('page:', features.page);
  console.log('limit:', features.limit);
  console.log('skip:', features.skip);
  console.log('queryObj:', features.queryObj);
  console.log('sort:', features.sortQuery);
  console.log('fields:', features.fields);
  console.log('🔥 GET ALL SITE CONTROLLER REACHED');

  const sites = await Site.findAll(
    features.queryObj,
    features.sortQuery,
    features.fields,
    features.limit,
    features.skip,
  );

  res.status(200).json({
    status: 'success',
    results: sites.length,
    data: {
      sites,
    },
  });
});

//create site
// CREATE SITE
exports.CreateSite = catchAsync(async (req, res, next) => {
  const newSite = await Site.create(req.body);

  res.status(201).json({
    status: 'success',
    site: newSite,
  });
});

// GET ONE SITE
exports.Getonesite = catchAsync(async (req, res, next) => {
  const site = await Site.findById(req.params.id);
  if (!site) {
    return next(new AppError('no site found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      site,
    },
  });
});

exports.Updatesite = factory.UpdateOne(Site);

// UPDATE SITE
//exports.Updatesite = catchAsync(async (req, res, next) => {
//const site = await Site.findByIdAndUpdate(req.params.id, req.body);

//if (!site) {
//   return next(new AppError('no site found with that ID', 404));
// }

// res.status(200).json({
//   status: 'success',
//    data: {
//      site,
//    },
//  });
//});

exports.deleteSite = factory.deleteOne(Site);

// DELETE SITE
//exports.deleteSite = catchAsync(async (req, res, next) => {
// const site = await Site.findByIdAndDelete(req.params.id);
//  if (!site) {
//   return next(new AppError('no site found with that ID', 404));
//  }
// res.status(204).json({
//  status: 'success',
//  data: null,
// });
//});

/*exports.getSiteState = async(req, res) =>{
  try{
    const stats = await Site.aggregate([
      {
        $match: {} 
      },
    ])

  }catch(err){
   res.status(500).json({
      status: 'fail',
      message: err,
    });
  }
}*/
