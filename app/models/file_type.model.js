const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const db = require('../common/mongooseDbConnection');

const FileTypeSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    fields: [{
        type: String,
        required: true,
    }],
    model: {
        type: JSON,
        required: false
    },
    version: {
        type: String,
        required: false
    },
    state: {
        type: String,
        required: false
    },
    company_id:{
        type: Schema.Types.ObjectId, // This sets type_id as an ObjectId
           // ref: 'Company',
        required: true
    },
    providerSettings: {
        type: Schema.Types.ObjectId,
        //ref: 'ai_provider_settings',
        required: true,
    },
    groups: [{
        type: String,
        required:false
    }],
    priority: {
        type: Number,
        required: false,
        default: 2,
    },
}, {strict: false});

module.exports = db.model('FileType', FileTypeSchema);
