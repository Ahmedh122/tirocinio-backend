const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const db = require('../common/mongooseDbConnection');

const FileSchema = new Schema({
    uploaded: {
        type: Date,
        required: true,
    },
    isDeleted: { type: Boolean, default: false },
    type: {
        type: String,
        required: false,
    },
    type_id: {
        type: Schema.Types.ObjectId, // This sets type_id as an ObjectId
        ref: 'FileType',
        required: true,
    },
    reference: {
        type: String,
        required: true,
        trim: true,
        index: {
            // This unique index is partial due to thousands of documents
            // that do not have it.
            unique: true,
            partialFilterExpression: {
                reference: {
                    $exists: true,
                    $type: "string",
                },
            },
        },
    },
}, {strict: false});

FileSchema.index({ "$**": "text" });
FileSchema.index({ "type_id": 1 });
FileSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

module.exports = db.model('File', FileSchema);
