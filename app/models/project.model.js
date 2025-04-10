// rewrite this model as a mongoose schema
const db = require('../common/mongooseDbConnection');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectSchema = new Schema({
    // TODO: use config.json or db entry
    id: {
        type: Number,
        primaryKey: true,
        autoIncrement: true
    },
    api_id: {
        type: String,
        required: true,
        unique: true
    },
    secret_key: {
        type: String,
    },
    priv_key: {
        type: String,
    },
    pub_key: {
        type: String,
    },
    remote_pub_key: {
        type: String,
    }

}, {strict: true});


module.exports = db.model('projects', ProjectSchema);
