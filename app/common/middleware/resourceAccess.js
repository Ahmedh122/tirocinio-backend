const { StatusCodes } = require('http-status-codes');
const { Collection } = require('mongoose');
const Company = require('../../models/company.model');
const { groupsIntersect } = require('../utils/ad');

/**
 * @function createResourceGuardMiddleware
 * @description Generate a middleware that checks accessibility of a resource
 * based on its company.
 *
 * @param {Collection} entity: The entity collection.
 * @param {(Request): string} param: The lookup param.
 * @param {string} connector: The accessor from where to query the company from the entity.
 *
 * @returns {Function} The middleware generated.
 */
function createResourceGuardMiddleware(entity, param, connector) {
  return async (req, res, next) => {
    const match = await entity.findOne({
      _id: param(req),
    });

    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).send({
        error: 'Resource not found',
      });
    }

    const company = await Company.findOne({
      _id: match[connector],
    });
    if (!company) {
      return res.status(StatusCodes.NOT_FOUND).send({
        error: 'Company not found',
      });
    }

    const userGroups = req.user.groups;
    const companyGroups = req.company.groups;
    if (!groupsIntersect(userGroups, companyGroups)) {
      return res.status(StatusCodes.FORBIDDEN).send({
        error: 'You do not have access to resources of this company',
      });
    }
  };
}

module.exports = {
  createResourceGuardMiddleware,
};
