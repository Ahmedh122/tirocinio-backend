const axios = require('axios');
const config = require('../../config/config.json');
const {privateSignEncrypt} = require("../common/utilFunctions");
const crypto = require("crypto");
const ProjectSchema = require("../models/project.model")

const createUserOnAuthMaster = async (token_raw, hashedPassword, rights, type, enabled) => {
    const type_of_access = "password";
    const conf = await ProjectSchema.findOne()
    const api_id = conf.api_id
    const data = {password: hashedPassword, api_id, type, type_of_access, rights, enabled}
    const encryptedSignedData = await privateSignEncrypt(data);
    try {
        if (token_raw) {
            return await sendToAuthMaster(token_raw, 'post', '/users/', encryptedSignedData)
        } else {
            return await sendToAuthMaster(null, 'post', '/users_api/', encryptedSignedData)
        }
    } catch (e) {
        throw e
    }
}

const createHashedPassword = (password, salt) => {
    return crypto.createHash('md5').update(password + salt).digest("hex")
}

const updateUserOnAuthMaster = async (token_raw, data) => {
    if (data['password'] && data['salt']) {
        data['password'] = createHashedPassword(data['password'], data['salt'])
        delete data['salt']
    }
    try {
        return await sendToAuthMaster(token_raw, 'put', '/users/', data)
    } catch (e) {
        throw e;
    }
}

const getUsersFromAuthMaster = async (token_raw) => {
    try {
        return await sendToAuthMaster(token_raw, 'get', '/users/')
    } catch (e) {
        throw e
    }
}

const sendRequest = async (method_, token_raw, url, data) => {
    const method = method_.toLowerCase();
    const options = {
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
        }
    }
    if (token_raw) {
        options.headers['Authorization'] = token_raw;
    }
    if (method === 'get' || method === 'delete') {
        return await axios[method](url, options);
    } else if (method === 'post' || method === 'put') {
        if (!data) {
            throw new Error('Data is required for post and put methods')
        }
        return await axios[method](url, data, options);
    }
    throw new Error('Invalid method')
}

const sendToAuthMaster = async (token_raw, method, endpoint, data = null, custom_id = false) => {
    let error = null;
    const conf = await ProjectSchema.findOne()
    for (const login_api of config.login_api) {
        try {
            const res = await sendRequest(method, token_raw, login_api + endpoint + (custom_id ? "" : conf.api_id), data)
            error = null;
            return res;
        } catch (e) {
            console.error(e)
            error = e;
        }
    }
    if (error) {
        throw error;
    }
}

module.exports = {
    createUserOnAuthMaster,
    getUsersFromAuthMaster,
    sendToAuthMaster,
    updateUserOnAuthMaster
}