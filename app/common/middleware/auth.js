const jwt = require('jsonwebtoken')
const config = require('../../../config/config.json')
const AD = require('../ActiveDirectoryConnection')
const { StatusCodes } = require('http-status-codes')

const authData = function (req) {
    let token
    try {
        token = (
            req.headers['x-access-token'] || req.headers['authorization']
        ).replace(/Bearer /, '')
    } catch (e) {
        console.log(e)
        return false
    }
    if (!token) return false

    try {
        token = jwt.verify(token, config.jwt_secret_key)
        req.token = token
        return token
    } catch (ex) {
        console.log(ex)
        return false
    }
}

const auth = async function (req, res, next) {
    return true
    const token = authData(req)
    if (!token) {
        return res.status(StatusCodes.UNAUTHORIZED).send('Invalid credentials.')
    }

    return next()
}

const isAdmin = async function (req, res, next) {
    const token = authData(req)

    AD.isAdmin(token.sAMAccountName)
        .then((isAdmin) => {
            if (isAdmin) {
                return next()
            } else {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: 'Unauthorized.' })
            }
        })
        .catch((err) => {
            console.log(err)
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .send('Internal Server Error.')
        })
}

const authAdmin = async function (req, res, next) {
    return auth(req, res, () => {
        isAdmin(req, res, next)
    })
}

const inRoles = (roles) => {
    return async function (req, res, next) {
        if (roles.includes(req.token.role)) {
            return next()
        }

        return res.status(StatusCodes.FORBIDDEN).json({
            error: "You don't have permission to access this resource.",
        })
    }
}

const authToken = (req, res, next) => {
  if (!req.headers['x-api-key']) {
    return res.status(StatusCodes.UNAUTHORIZED).send({
      "error": "Unauthorized",
    });
  }

  if (!config.gpt_auth.api_key === req.headers['x-api-key']) {
    return res.status(StatusCodes.UNAUTHORIZED).send({
      "error": "Unauthorized",
    });
  }

  next();
}

module.exports = { auth, isAdmin, authAdmin, inRoles, authToken }
