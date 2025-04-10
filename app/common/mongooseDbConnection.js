// Connect to mongodb using mongoose
const mongoose = require('mongoose');
mongoose.set('debug', true);
const config = require('../../config/config.json');

mongoose.Promise = global.Promise;
let db
try {
    db = mongoose.createConnection(config.mongo_configs.host)
    console.log('Successfully connect to MongoDB.');
} catch (err) {
    console.error('Connection error', err);
    process.exit();
}

module.exports = db;
