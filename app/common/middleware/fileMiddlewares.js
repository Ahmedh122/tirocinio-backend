/*)*
 * @fileoverview File utilities.
 */
const { StatusCodes } = require('http-status-codes');
const File = require('../../models/file.model');
const FileType = require('../../models/file_type.model');
//const CacheFornitore = require('../../models/cache_fornitori');
//const CacheDestinazione = require('../../models/cache_destinazioni');
const {
  mergeObjects,
  getFileField,
  extractPathFromFileType,
} = require('../utils/file');
const { escapeRegexString } = require('../utils/regex');
const mongo = require('mongoose');

/**
 * @function withFilters: Middleware to compile a file filters. This middleware
 * prepares a filter for the following cases:
 * - global search;
 * - omni search;
 * - status search.
 *
 * @param req: Request
 * @param res: Response
 * @param next: NextFunction
 */
const withFilters = async (req, res, next) => {
  const { type_id, status, q = '', search = {} } = req.query;
  const globalSearchTokens = q.split(' ').map(token => new RegExp(escapeRegexString(token), 'i'));

  // Direct filters on documents.
  // This includes type_id (required), column filters (search), and status
  // filters.
  const filters = {
    type_id: new mongo.Types.ObjectId(type_id),
  };

  for (const key of Object.keys(search)) {
    filters[key] = new RegExp(escapeRegexString(search[key]), 'i');
  }

  if (status) {
    if (Array.isArray(status)) {
      filters.status = {
        $in: status,
      }
    } else {
      filters.status = status;
    }
  }

  req.pipeline = [
    {
      $match: filters,
    },
    // Project result and edited into result.
    // This is needed to not look up column filters on old values.
    // NOTE: the $mergeObjects stage aggregator does not work, as it simply
    // does not do a deep merge.
    // Unfortunately, we have to use a custom recursive function.
    {
      $set: {
        result: {
          $function: {
            body: `
              function deepMerge(obj1, obj2) {
                if (!obj1) return obj2;
                if (!obj2) return obj1;

                for (const key in obj2) {
                  if (obj2.hasOwnProperty(key)) {
                    if (typeof obj2[key] === 'object') {
                      obj1[key] = deepMerge(obj1[key], obj2[key]);
                    } else {
                      obj1[key] = obj2[key];
                    }
                  }
                }
                return obj1;
              }
            `,
            args: ['$result', '$edited'],
            lang: 'js',
          },
        },
      },
    },
    // To apply global filtering, we define a search area.
    // The search area is composed of multiple fields inside of result,
    // edited, and the pdf filename.
    // Since the fields can technically not exist, we set their value to
    // an empty state by default.
    {
      $addFields: {
        // Needed by the frontend.
        file_name: '$pdf.originalname',

        // Needed for global search.
        searchArea: {
          $reduce: {
            initialValue: '',
            input: [
              {$objectToArray: {
                $ifNull: ['$result.INFORMAZIONI', {v: ''}],
              }},
              {$objectToArray: {
                $ifNull: ['$result.CAMPI', {v: ''}],
              }},
              [{v: '$pdf.originalname'}],
            ],
            in: {
              $concat: ["$$value", " ", {
                $reduce: {
                  initialValue: '',
                  input: '$$this',
                  in: {
                    $concat: ['$$value', {$toString: '$$this.v'}],
                  },
                },
              }],
            },
          },
        },
      },
    },
    (!globalSearchTokens ? null : {
      $match: {
        $and: globalSearchTokens.map(token => ({
          searchArea: token,
        }))
      },
    }),
    // Remove unnecessary fields.
    {
      $unset: ['textFile', 'pdfFile', 'content', 'debug', 'searchArea', 'pdf.buffer'],
    },
  ].filter(stage => stage !== null);

  return next();
};

/**
 * @function withFileOr404: Middleware to get the file from the "id" parameter.
 * Returns 404 on fail.
 *
 * @param req: Request
 * @param res: Response
 * @param next: NextFunction
 */
const withFileOr404 = async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
  });

  if (!file) {
    return res.status(StatusCodes.NOT_FOUND).send({
      error: 'File not found',
    });
  }

  req.file = file;
  next();
};

/**
 * @function withPopulateFromCache: Middleware to populate the cache values
 * from the current state.
 *
 * @param req: Request
 * @param res: Response
 * @param next: NextFunction
 */

module.exports = {
  withFilters,
  withFileOr404,
};
