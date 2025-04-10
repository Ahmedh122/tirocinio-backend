const config = require('../../config/config.json')

const roleGroups = [
    config.ad_config.admin_group,
    config.ad_config.user_group,
]

module.exports = {
    roleGroups,
}