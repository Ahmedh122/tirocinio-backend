const FileType = require('../../models/file_type.model');
const Company = require('../../models/company.model');
const { StatusCodes } = require('http-status-codes');
const { CompanyAISettings } = require('../../models/company_ai_settings.model');

const withValidProviderForUpdate = async (req, res, next) => {
  if (!req.body.providerSettings) {
    next();
  }

  const fileType = await FileType.findById(req.params.id);
  const [settings, company] = await Promise.all([
    CompanyAISettings.findOne({ _id: req.body.providerSettings }),
    Company.findOne({ _id: fileType.company_id }),
  ]);

  if (!settings) {
    return res.status(StatusCodes.NOT_FOUND).send({
      error: 'Provider not found',
    });
  }

  if (!company) {
    return res.status(StatusCodes.NOT_FOUND).send({
      error: 'Company not found',
    });
  }

  if (settings.company !== null && settings.company.toString() !== company._id.toString()) {
    return res.status(StatusCodes.CONFLICT).send({
      error: 'The provider settings specified cannot be used on this company',
    });
  }

  next();
};

module.exports = {
  withValidProviderForUpdate,
};
