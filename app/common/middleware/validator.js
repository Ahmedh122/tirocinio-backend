const {body, validationResult} = require('express-validator');
const { Provider } = require('../../models/ai_provider.model');
const userValidationRules = () => {
    return [
        body('username').isLength({min: 1}),
        body('password').isLength({min: 8}),
        body('type').custom(value => {
            if (!(['user', 'admin'].some(v => v === value))) {
                return Promise.reject('type must be admin or user');
            } else return true;
        }),
    ]
}

const aiProviderValidationRules = () => {
  return [
    body('provider').isISIN(Object.values(Provider)),
    body('name').isLength({min: 4, max: 63}),
  ];
}

const userUpdateValidationRules = () => {
    return [
        body('username').isLength({min: 1}).optional(),
        body('password').isLength({min: 8}).optional(),
        body('type').custom(value => {
            if (!(['user', 'admin'].some(v => v === value))) {
                return Promise.reject('type must be admin or user');
            } else return true;
        }).optional(),
    ]
}

const pointValidationRules = () => {
    return [
        // username must be an email
        body('coord').exists(),
        // password must be at least 5 chars long
        body('nome').isLength({min: 1}),
        // body('indirizzo').isLength({min: 1}).optional(),
        body('civico').isLength({min: 1}).optional(),
        body('comune').isLength({min: 1}).optional(),
        body('localita').isLength({min: 1}).optional(),
        //body('uso_prec').isLength({min: 1}),
        body('vincolo').isLength({min: 1}).optional(),
        //body('pubblica').isLength({min: 1}),

        // body('age').isNumeric(),
    ]
}


const pointUpdateValidationRules = () => {
    return [
        // username must be an email
        // body('coord').exists(),
        // password must be at least 5 chars long
        body('nome').optional().isLength({min: 1}).optional(),
        body('indirizzo').optional().isLength({min: 1}).optional(),
        body('civico').optional().isLength({min: 1}).optional(),
        body('comune').optional().isLength({min: 1}).optional(),
        body('localita').optional().isLength({min: 1}).optional(),
        //body('uso_prec').isLength({min: 1}),
        body('vincolo').optional().isLength({min: 1}).optional(),
        //body('pubblica').isLength({min: 1}),

        // body('age').isNumeric(),
    ]
}

const clientValidationRules = () => {
    return [
        // username must be an email
        body('api_key').exists(),
        // password must be at least 5 chars long
        body('api_secret').isLength({min: 1}),
        body('nome').isLength({min: 1}),
        // body('age').isNumeric(),
    ]
}

const userClientValidationRules = () => {
    return [
        // username must be an email
        body('status').exists(),
        // password must be at least 5 chars long
        body('client').exists(),
        // body('age').isNumeric(),
    ]
}
const validate = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
        return next()
    }
    const extractedErrors = []
    errors.array().map(err => extractedErrors.push({[err.param]: err.msg}))

    return res.status(422).json({
        errors: extractedErrors,
    })
}

module.exports = {
    userValidationRules,
    userUpdateValidationRules,
    pointValidationRules,
    pointUpdateValidationRules,
    clientValidationRules,
    userClientValidationRules,
    aiProviderValidationRules,
    validate,
}
