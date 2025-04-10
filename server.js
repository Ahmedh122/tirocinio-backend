const config = require('./config/config.json')
const {
    ActiveDirectoryConnection,
    verifyOU,
} = require('./app/common/ActiveDirectoryConnection')
const express = require('express');
const app = express();

const cors = require('cors');
const bodyParser = require('body-parser');

/**
 * Options are the same as multiparty takes.
 * But there is a new option "autoClean" to clean all files in "uploadDir" folder after the response.
 * By default, it is "false".
 */

// make server object that contain port property and the value for our server.
const server = {
    port: process.env.PORT || config.port_api,
    poolSize: 5
};

app.use(cors())
app.use(bodyParser.json({ limit: '500mb'}));
app.use(bodyParser.urlencoded({ extended: false}));

// routers
const ErrorHandler = require('./app/common/error/ErrorHandler');
const FileRouter = require('./app/routers/FileRouter')


app.use(ErrorHandler);
app.use(FileRouter);

/**
 * Needed to connect to Active Directory before starting the server
 * (in order to avoid connection problems when the first request is made)
 * @see ActiveDirectoryConnection
 */
//ActiveDirectoryConnection.getAd()


/**
 * Verifies if the admin OU exists in the Active Directory at the start of the server
 
verifyOU(config.ad_config.admin_group).then((res) => {
    if (res === false) {
        console.log('Error: Admin OU not found')
    } else {
        console.log('Admin OU found')
    }
})


 * Verifies if the users OU exists in the Active Directory at the start of the server
 
verifyOU(config.ad_config.users_group).then((res) => {
    if (res === false) {
        console.log('Error: Users OU not found')
    } else {
        console.log('Users OU found')
    }
})
*/
app.listen(server.port, () =>
    console.log(`Server started, listening on port: ${server.port}`));
