// rewrite this model as a mongoose schema
const db = require('../common/mongooseDbConnection');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    // Model attributes are defined here
    id: {
        type: Number, primaryKey: true, autoIncrement: true
    }, username: {
        type: String, required: true, unique: true
    }, password: {
        type: String, required: true
    }, remote_uuid: {
        type: String, required: true, unique: true
    }, name: {
        type: String,
    }, lastname: {
        type: String
    },
    unique_code: {
        type: String,
        unique: true,
    }
}, {strict: true});

module.exports = db.model('users', UserSchema);
