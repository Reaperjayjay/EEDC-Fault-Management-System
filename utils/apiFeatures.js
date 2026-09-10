class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };

    const excludedFields = ['page', 'limit', 'fields', 'sort'];

    excludedFields.forEach((el) => delete queryObj[el]);

    Object.entries(queryObj).forEach(([key, value]) => {
      const match = key.match(/^(.+)\[(gte|gt|lte|lt|eq)\]$/);

      if (match) {
        const [, field, operator] = match;

        queryObj[field] = {
          operator,
          value,
        };

        delete queryObj[key];
      }
    });

    this.queryObj = queryObj;

    return this;
  }

  sort() {
    this.sortQuery = this.queryString.sort || null;

    return this;
  }

  limitFields() {
    this.fields = this.queryString.fields || null;

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.page = page;
    this.limit = limit;
    this.skip = skip;

    return this;
  }
}

module.exports = ApiFeatures;
