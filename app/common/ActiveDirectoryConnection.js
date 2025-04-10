const config = require('../../config/config.json')
const ActiveDirectory = require('activedirectory2')
const util = require('util')
const { roleGroups } = require('./ADGroups')

/**
 * Class to manage Active Directory connection
 * @class ActiveDirectoryConnection
 * @static
 *
 * @property {ActiveDirectory} ad - Active Directory connection object
 *
 * @method getAd - Method to get Active Directory connection object
 */
class ActiveDirectoryConnection {
    static ad

    /**
     * Method to get Active Directory connection object
     * @returns {ActiveDirectory} - Active Directory connection object
     * @async
     * @static
     */
    static async getAd() {
        if (this.ad) {
            return this.ad
        }

        console.log('Initializing Active Directory connection...')
        this.ad = new ActiveDirectory({
            url: config.ad_config.url,
            baseDN: config.ad_config.baseDN,
            username: config.ad_config.username,
            password: config.ad_config.password,
            tlsOptions: {
                rejectUnauthorized: false,
            },
        })

        const authenticate = util.promisify(this.ad.authenticate).bind(this.ad)
        try {
            const auth = await authenticate(
                config.ad_config.username,
                config.ad_config.password
            )
            console.log('Connected to LDAP server!')
        } catch (err) {
            console.error('Error while connecting to LDAP: ', err)
        }
    }
}

/**
 * Function to authenticate user with Active Directory
 * @param {string} username - Username of the user
 * @param {string} password - Password of the user
 * @returns {object | false} - Returns user if user is authenticated, false otherwise
 */
async function userLogin(username, password) {
    const ad = ActiveDirectoryConnection.getAd()
    let res = false

    console.log('Authenticating user: ', username)

    await ad.then(async (ad) => {
        const authenticate = util.promisify(ad.authenticate).bind(ad)
        try {
            let usr = await findUser(username)
            console.log(
                'User found: ',
                usr ? usr.userPrincipalName : 'Not found'
            )
            //console.log(usr);

            if (!username.includes('@')) {
                username = username + '@' + config.ad_config.domain
            }

            const auth = await authenticate(username, password)
            console.log('User authenticated: ', auth ? 'Yes' : 'No')

            if (auth) {
                res = usr
            }
        } catch (err) {
            console.error('Error while authenticating: ', err)
        }
    })

    return res
}

/**
 * Function to login and get only the data that we
 * need in the token
 * @param {String} username - AD username
 * @param {String} password - AD pasword
 * @returns {Object|False}
 */

async function tokenUserLogin(username, password) {
    const user = await userLogin(username, password)

    if (!user) {
        return false
    }
    let token = {
        sAMAccountName: user.sAMAccountName,
        role: 'user',
        groups: [],
        cn: user.cn,
        upn: user.userPrincipalName,
        email: user.mail ? user.mail : user.userPrincipalName,
        guid: user.objectGUID,
    }

    if (await isAdmin(user.sAMAccountName)) {
        token.role = 'admin'
    }
    token.groups = await getGroups(user.sAMAccountName)

    return token
}

/**
 * Function to find user in Active Directory
 * @param {string} username - Username of the user
 * @returns {object | false} - Returns user if user is found, false otherwise
 */
async function findUser(username) {
    const ad = ActiveDirectoryConnection.getAd()
    res = false

    await ad.then(async (ad) => {
        const opts = {
            attributes: ['*'],
        }

        const findUser = util.promisify(ad.findUser).bind(ad)
        try {
            const user = await findUser(opts, username)
            groups = await getGroups(user.sAMAccountName)
            user.groups = groups
            res = user
        } catch (err) {
            console.log('404 - Error while finding user: ', err)
            res = false
        }
    })

    return res
}

/**
 * Returns the groups of a user
 * @param {string} username - Username of the user
 * @param {boolean} removeSpecialGroups - Removes the bakeka admin and user identifiers
 * @returns {object} - Returns
 */
async function getGroups(sAMAccountName, removeSpecialGroups = false) {
    const ad = ActiveDirectoryConnection.getAd()
    let res = false

    await ad.then(async (ad) => {
        const getGroups = util.promisify(ad.getGroupMembershipForUser).bind(ad)

        const opts = {
            attributes: ['*'],
        }

        try {
            let grp = await getGroups(opts, sAMAccountName)
            grp = grp.map((group) => {
                return {
                    name: group.cn,
                    guid: group.objectGUID,
                }
            })

            res = grp
        } catch (err) {
            console.error('Error while finding user: ', err)
            res = false
        }
    })

    return res
}

/**
 * Returns all groups in Active Directory
 * @param {boolean} removeSpecialGroups - Removes the bakeka admin and user identifiers
 * @returns {Promise<object[]>} - Returns an array of all group objects
 */
async function getAllGroups(removeSpecialGroups = false) {
    const ad = ActiveDirectoryConnection.getAd();
    let res = false;

    await ad.then(async (ad) => {
        const getAllGroups = util.promisify(ad.find).bind(ad);

        const opts = {
            filter: '(&(objectClass=group))', // Filter to only retrieve group objects
            attributes: ['*'], // Retrieve all attributes of the group
        };

        try {
            let groups = await getAllGroups(opts);
            console.log(groups)
            groups = groups.groups.map((group) => {
                return {
                    name: group.cn,
                    guid: group.objectGUID,
                };
            });

            if (removeSpecialGroups) {
                groups = groups.filter(group => !roleGroups.includes(group.name));
            }

            res = groups;
        } catch (err) {
            console.error('Error while retrieving groups');
            throw(err)
        }
    });

    return res;
}


/**
 * Returns true if the user belongs to the group
 * @param {string} sAMAccountName - Username of the user
 * @param {string} group - Group to check
 * @returns {boolean} - Returns true if the user belongs to the group
 */
async function belongsToGroup(sAMAccountName, group) {
    let res = false
    let groups = await getGroups(sAMAccountName)
    if (groups) {
        res = groups.some((g) => g.name === group)
    }
    return res
}

/**
 * Returns true if the user is an admin
 * @param {string} sAMAccountName - Username of the user
 * @returns {Promise<boolean>} - Returns true if the user is an admin
 */
async function isAdmin(sAMAccountName) {
    return belongsToGroup(sAMAccountName, config.ad_config.admin_group)
}

/**
 * Returns true if the user is a user
 * @param {string} sAMAccountName - Username of the user
 * @returns {boolean} - Returns true if the user is a user
 */
async function isUser(sAMAccountName) {
    return belongsToGroup(sAMAccountName, config.ad_config.user_group)
}

/**
 *  Verify that the ou exists using the guid
 *  @param {string} guid - guid of the ou
 *  @returns {boolean} - Returns true if the ou exists
 */
async function verifyOU(guid) {
    const ad = ActiveDirectoryConnection.getAd()
    let res = false

    await ad.then(async (ad) => {
        const opts = {
            filter: `(&(objectClass=group)(objectGUID=${guid}))`,
            scope: 'sub',
            attributes: ['*'],
        }

        const findGroup = util.promisify(ad.findGroup).bind(ad)
        try {
            let grp = await findGroup(opts)
            res = grp
        } catch (err) {
            console.error('Error while finding group: ', err)
            res = false
        }
    })

    return res
}

/**
 * Verify that the upn exists using the guid
 * @param {string} guid - guid of the upn
 * @returns {boolean} - Returns true if the upn exists
 */
async function verifyGuid(guid) {
    const ad = ActiveDirectoryConnection.getAd()
    let res = false

    await ad.then(async (ad) => {
        const opts = {
            filter: `(&(objectClass=user)(objectGUID=${guid}))`,
            scope: 'sub',
            attributes: ['*'],
        }

        const findUser = util.promisify(ad.findUser).bind(ad)
        try {
            let usr = await findUser(opts)
            res = usr
        } catch (err) {
            console.error('Error while finding user: ', err)
            res = false
        }
    })

    return res
}

module.exports = {
    ActiveDirectoryConnection,
    userLogin,
    tokenUserLogin,
    getGroups,
    getAllGroups,
    isAdmin,
    isUser,
    findUser,
    verifyOU,
    verifyGuid
}
