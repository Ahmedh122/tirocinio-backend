const config = require('../../config/config.json');
const axios = require('axios');
const { stripQuotes } = require('./utilFunctions');
const { Bridge } = require('./Bridge');
const { mergeFieldsAndSchema } = require('./utils/file/modelUtils');

const validateString = (value, model) => {
  if (typeof value !== 'string') {
    return 'Value must be a string';
  }
  if (model.lengthMin && value.length < model.lengthMin) {
    return `Value must be at least ${model.lengthMin} characters long`;
  }
  if (model.lengthMax && value.length > model.lengthMax) {
    return `Value must be at most ${model.lengthMax} characters long`;
  }
  return null;
};

const validateNumber = (value, model) => {
  if (typeof value !== 'number') {
    return 'Value must be a number';
  }
  if (model.min !== undefined && value < model.min) {
    return `Value must be at least ${model.min}`;
  }
  if (model.max !== undefined && value > model.max) {
    return `Value must be at most ${model.max}`;
  }
  return null;
};

const validateDate = (value, model) => {
  // Split the date string and rearrange to YYYY-MM-DD format
  const [day, month, year] = value.split('/');
  const formattedDate = `${year}-${month}-${day}`;

  const date = new Date(formattedDate);

  if (isNaN(date.getTime())) {
    return 'Value must be a valid date';
  }

  // Format model.min and model.max if they exist
  const formatModelDate = (dateString) => {
    if (!dateString) return null;
    const [d, m, y] = dateString.split('/');
    return new Date(`${y}-${m}-${d}`);
  };

  const minDate = formatModelDate(model.min);
  const maxDate = formatModelDate(model.max);

  if (minDate && date < minDate) {
    return `Date must be on or after ${model.min}`;
  }

  if (maxDate && date > maxDate) {
    return `Date must be on or before ${model.max}`;
  }

  return null;
};

const remoteValidation = async (value, remoteConfig) => {
  try {
    function purgeQuotesFromObject(object) {
      return Object.entries(object).reduce((acc, [key, val]) => {
        acc[key] = stripQuotes(val);
        return acc;
      }, {});
    }

    const params = {
      ...purgeQuotesFromObject(remoteConfig.params || {}),
      ...purgeQuotesFromObject(remoteConfig.input || {}),
    };

    const response = await Bridge.send(
      stripQuotes(remoteConfig.url),
      'get',
      {
        [stripQuotes(remoteConfig.apiKey)]: stripQuotes(remoteConfig.apiSecret),
      },
      {
        ...params,
      }
    );

    const remoteKey = params[remoteConfig.key];
    const match = response.data.filter((el) => {
      return el[remoteKey].toString() === value.toString();
    });

    if (match.length === 0) {
      console.error('Remote validation failed: value not found');
      return 'Remote validation failed: value not found';
    }

    return null;
  } catch (error) {
    return `Remote validation runtime error: ${error.message}`;
  }
};

const validate = async (value, model) => {
  if (
    model.mandatory &&
    (value === undefined || value === null || value === '')
  ) {
    return 'Value is required';
  }

  if (
    !model.mandatory &&
    (value === undefined || value === null || value === '')
  ) {
    return null;
  }

  let error;

  switch (model.type) {
    case 'remoteValidation':
    case 'string':
      error = validateString(value, model);
      break;
    case 'number':
    case 'integer':
    case 'float':
      error = validateNumber(value, model);
      break;
    case 'date':
      error = validateDate(value, model);
      break;
    default:
      return `Unsupported type: ${model.type}`;
  }

  if (error) {
    return error;
  }

  if (model.remoteValidation) {
    return await remoteValidation(value, model.remoteValidation);
  }

  return null;
};

const validateFile = async (file, fileType) => {
  const fields = mergeFieldsAndSchema(file, fileType);
  const errors = await Promise.all(
    fields.map(async (field) => {
      const error = await validate(field.value, field);
      return {
        // Return field details.
        field: {
          label: field.label,
          path: field.path,
          field: field.field,
          type: field.type,
          mandatory: field.mandatory,
          value: field.value,
        },
        error: error,
      };
    })
  );

  return errors.filter((field) => field.error !== null);
};

module.exports = { validate, validateFile };
