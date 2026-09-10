const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.UpdateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body);

    if (!doc) {
      return next(new AppError('no site found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, dataName) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError('No doc found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        [dataName]: doc,
      },
    });
  });

exports.getAll = (Model, dataName) =>
  catchAsync(async (req, res) => {
    const features = new ApiFeatures(Model, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await Model.findAll(
      features.queryObj,
      features.sortQuery,
      features.fields,
      features.limit,
      features.skip,
    );

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        [dataName]: docs,
      },
    });
  });
