const File = require('../models/file.model');
const FileType = require('../models/file_type.model');
const { validationErrorMessage, stripQuotes } = require("../common/utilFunctions");
const { validate, validateFile } = require("../common/validationFunctions");
const { HttpStatusCode } = require('axios');
const fs = require('fs');
const nodePath = require('path');
const config = require('../../config/config.json')
const {mergeObjects, getFileField} = require('../common/utils/file/');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');

const createFile = async (req, res) => {
    try {
        const { name, path, uploaded, type } = req.body;
        const newFile = await File.create({ name, path, uploaded, type });
        return res.status(201).send(newFile);
    } catch (e) {
        console.error("FileController.createFile: ", e);
        if (e.name === "ValidationError") {
            return res.status(422).send(validationErrorMessage(e))
        }
        return res.status(500).send({ error: "Failed to create file" });
    }
};

const getFiles = async (req, res) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page || 1), 1);
        const limit = Math.max(Number.parseInt(req.query.limit || 10), 1);
        const sort = req.query.sort || 'uploaded';
        const sortMethod = req.query.sortMethod || -1;

        const [result, countResult] = await Promise.all([
          File.aggregate([
            // Add isDeleted filter before the existing pipeline
            { $match: { $or: [{ isDeleted: false }, { isDeleted: null }] } },
            ...req.pipeline
          ])
            .sort({ [sort]: sortMethod })
            .skip((page - 1) * limit)
            .limit(limit),

          File.aggregate([
            // Add the same isDeleted filter here
            { $match: { $or: [{ isDeleted: false }, { isDeleted: null }] } },
            ...req.pipeline,
            {
              $group: { _id: null, count: { $sum: 1 } },
            },
            {
              $replaceRoot: {
                newRoot: {
                  totalItems: "$count",
                },
              },
            },
          ]),
        ]);

        const count = countResult.length > 0 ? countResult[0].totalItems : 0;
        return res.status(200).send({
            totalItems: count,
            totalPages: Math.ceil(count / Math.max(limit, 1)),
            content: result,
        });
    } catch (e) {
        console.error("FileController.getFiles: ", e);
        return res.status(500).send({ error: "Failed to get file list" });
    }
};

const getFile = async (req, res) => {
    try {
        const result = JSON.parse(JSON.stringify(req.file._doc));
        result.result = mergeObjects(result.result, result.edited, true);
        return res.status(200).send(result);
    } catch (e) {
        console.error("FileConttoller.getFile", e)
        return res.status(500).send({ error: "Failed to get file data" });
    }
}
const getDataset = async (req, res) => {
    const id = req.params.id;
    try {
        // Find the file by its ID
        let file = await File.findOne({ _id: id });
        if (!file) {
            return res.status(404).send({ error: 'Not found' });
        }

        // Process the file data
        let resul = JSON.parse(JSON.stringify(file._doc));
        resul.result = mergeObjects(file.result, file.edited, true);

        // Format the response data
        const formattedData = {
            input_text: file.debug, // Assuming `file.debug` contains the input text
            target_text: resul.result // `resul.result` is the processed output
        };

        // Send the JSON response with the correct content type
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(formattedData);
    } catch (e) {
        console.error('FileController.getFile', e);
        return res.status(500).send({ error: 'Failed to get file data' });
    }
};
const getDatasets = async (req, res) => {
    try {
        // Find all files with status 'CONFIRMED'
        let files = await File.find({ status: 'CONFIRMED' });
        if (!files || files.length === 0) {
            return res.status(404).send({ error: 'No confirmed files found' });
        }

        // Process the file data
        const formattedData = files.map(file => {
            const resul = JSON.parse(JSON.stringify(file._doc));
            resul.result = mergeObjects(file.result, file.edited, true);

            return {
                input_text: file.debug, // Assuming `file.debug` contains the input text
                target_text: resul.result // `resul.result` is the processed output
            };
        });

        // Send the JSON response with the correct content type
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(formattedData);
    } catch (e) {
        console.error('FileController.getConfirmedFiles', e);
        return res.status(500).send({ error: 'Failed to get file data' });
    }
};

// Function to process INFORMAZIONI and CAMPI
const processIntestazioni = (intestazioni) => {
    const result = {
        INFORMAZIONI: {},
        CAMPI: {}
    };

    for (const section of Object.values(intestazioni)) {
        for (const campo of section.campi) {
            if (campo.path === 'INFORMAZIONI') {
                result.INFORMAZIONI[campo.field] = {
                    label: campo.label,
                    type: campo.type,
                    mandatory: campo.mandatory,
                    remoteValidation: campo.remoteValidation,
                };
            } else if (campo.path === 'CAMPI') {
                result.CAMPI[campo.field] = {
                    label: campo.label,
                    type: campo.type,
                    mandatory: campo.mandatory,
                    remoteValidation: campo.remoteValidation,
                };
            }
        }
    }

    return result;
};


const updateFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, type_id, edited } = req.body;
        if (!edited) {
            return res.status(422).send({ error: "No edited found" });
        }
        const file = await File.findOne({ _id: id });
        if (!file) {
            return res.status(404).send({ error: "File not found" });
        }
        const ftype_id = type_id || file.type_id
        const fileType = await FileType.findOne({ _id: ftype_id })
        let o = {}
        let path = {}
        let path2 = {}
        for (const key of Object.keys(edited)) {
            for (const obname of Object.keys(edited[key])) {
                o = edited[key][obname]
                path2 = obname
            }
            path = key
        }
        const rules = processIntestazioni(fileType.model.Intestazioni)
        const error = await validate(o, rules[path][path2])
        if (error) {
            console.error("FileController.updateFile: ", error)
            return res.status(422).send({ error: "invalid field" })
        }

        const merged = mergeObjects(file.edited, edited, true)

        const updated = await File.findByIdAndUpdate(
            id,
            { edited: merged, type, type_id, name },
            { new: true })
        if (!updated){
                return res.status(422).send();
        }

        return res.status(200).send(edited);
    } catch (e) {
        console.error("FileController.updateFile: ", e);
        return res.status(500).send({ error: "Failed to update file" });
    }
};


const getResult = async (req, res) => {
    return res.status(200).send({ text: "", title: "export.txt" });
}

const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await File.findByIdAndUpdate(
          id,
          { isDeleted: true },
          { new: true }
        );
        if (!file) {
            return res.status(404).send({ error: "File not found" });
        }
        return res.status(200).send({ message: "File deleted successfully" });
    } catch (e) {
        console.error("FileController.deleteFile: ", e);
        return res.status(500).send({ error: "Failed to delete file" });
    }
};

function safeParseJSON(d) {
    // Check if the input is already an object; if so, return it directly
    let data = d
    if (!data || data == "undefined" || data == "null") {
        return null
    }
    if (typeof data === 'object') {
        data = JSON.stringify(data);
    }

    // If it's a string, try parsing it as JSON
    try {
        return JSON.parse(data);
    } catch (error) {
        // If parsing fails, you can handle the error or return null, depending on your use case
        console.error('Failed to parse JSON:', d, error);
        return null;
    }
}
async function addRow(req, res) {
    const { id } = req.params;
    const file = await File.findOne({ _id: id });
    if (!file) {
        return res.status(404).send({ error: "File not found" });
    }

    if (!file.edited) {
        file.edited = { TABELLA: [] };
    } else if (!file.edited.TABELLA) {
        file.edited.TABELLA = [];
    }

    const newRowID = Math.max(
        ...file.result.TABELLA.map(row => row.id),
        ...file.edited.TABELLA.map(row => row.id)
    ) + 1;

    // If the user provides a payload, add it to the new row as is.
    // Otherwise, create a new empty row.
    let payload = req.body || {};
    file.edited.TABELLA = editRowLocal(newRowID, file.edited.TABELLA, { ...payload, id: newRowID });

    const updated = await File.findByIdAndUpdate(id, { edited: file.edited }, { new: true });

    return res.status(200).send({ result: updated.edited });
}

function editRowLocal(id, rows, body) {
    let r = rows || []
    let found = false
    r = r.map(row => {
        console.log(id, row.id)
        if (row.id === id) {
            found = true
            if (Object.keys(body).length === 1)
                return body
            return { ...row, ...body }
        } else {
            return row
        }
    })
    if (!found) {
        r.push(body)
    }
    return r
}

async function deleteRow(req, res) {
    const { id, row_id } = req.params
    try {
        const file = await File.findOne({ _id: id });
        let edited = file.edited
        if (!edited) {
            edited = {TABELLA: file.result.TABELLA};
            if (!edited.TABELLA) {
                return res
                    .status(StatusCodes.CONFLICT)
                    .send({ error: "This table does not contain any rows" });
            }
        }

        // If the row was created, we need to delete it from the edited array.
        if (file.result.TABELLA.find(row => row.id === Number(row_id)) === undefined) {
            edited.TABELLA = edited.TABELLA.filter(row => row.id !== Number(row_id))
        }
        
        // If instead the row was originally present, we need to specify that in
        // the edited array.
        else {
            edited.TABELLA = editRowLocal(Number(row_id), edited.TABELLA, { id: parseInt(row_id) })
        }

        const updated = await File.findByIdAndUpdate(id, { edited }, { new: true })
        if (!updated) {
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .send({ error: "Delete row failed" });
        }

        return res.status(200).send({result: edited});
    } catch (e) {
        console.error("FileController.deleteRow: ", e)
    }
}

async function editRow(req, res) {
    const { id, row_id } = req.params
    const body = req.body
    body['id'] = parseInt(row_id)
    try {
        const file = await File.findOne({ _id: id });
        if (!file) {
            return res.status(404).send({ "error": "Not found" })
        }
        let edited = file.edited
        if (!edited) {
            edited = { TABELLA: [] }
        }
        edited.TABELLA = editRowLocal(parseInt(row_id), edited.TABELLA, body)
        const updated = await File.findByIdAndUpdate(id, { edited }, { new: true })
        if (!updated)
            throw("Delete row failed")
        return res.status(200).send({result: edited});
    } catch (e) {
        console.error("FileController.editRow: ", e)
        console.error()
    }
}

async function count(req, res) {
  try {
       let stages = [{
        $group: {
          _id: { status: "$status" },
          count: { $sum: 1 },
        }
      }, {
        $addFields: {
          status: "$_id.status",
        }
    }];

    // Add isDeleted filter as the first stage
    stages = [{
        $match: {
            $or: [{ isDeleted: false }, { isDeleted: null }]
        }
    }, ...stages];

    if (req.query.type_id) {
        stages = [{
            $match: {
                type_id: mongoose.Types.ObjectId(req.query.type_id),
            },
        }, ...stages];
    }

    if (req.query.company_id) {
        stages = [{
            $lookup: {
                from: "filetypes",
                as: "type",
                localField: "type_id",
                foreignField: "_id",
            },
        }, {
            $set: {
                type: {
                    $first: "$type",
                },
            },
        }, {
            $match: {
                "type.company_id": mongoose.Types.ObjectId(req.query.company_id),
            },
        }, ...stages];
    }


    const count = await File.aggregate(stages);
    const data = count.reduce((acc, key) => {
        acc[key.status] = key.count;
        return acc;
    }, {});

    return res.status(200).send(data);
  } catch (e) {
    console.error("FileController.count error: ", e.message);
    console.error(e.stack);
    return res.status(500).send({
      error: "Internal server error",
    })
  }
}


function dateToAAMMGG(field, length, mandatory) {
  try {
    const [gg, mm, aaaa] = field.split('/');
    const aa = aaaa.slice(-2);
    const val = `${aa}${mm}${gg}`;
    return val.padEnd(length, ' ');
  } catch (e) {
    console.error("FileController.dateToAAMMGG: ", e);
    if (mandatory) {
      throw e;
    }

    return "000000";
  }
}

function formatValue(fieldName, field, valueType, length, decimals, mandatory) {
    let formattedValue;

    switch (valueType) {
        case "integer":
            if (!field) {
                if (mandatory) {
                    throw new FieldValidationError(fieldName);
                }

                field = 0;
            }

            formattedValue = (parseInt(field) || 0).toString();

            if (formattedValue.length > length) {
                formattedValue = formattedValue.slice(-length);
            } else {
                formattedValue = formattedValue.padStart(length, '0');
            }
            break;

        case "float":
            if (!field) {
                if (mandatory) {
                    throw new FieldValidationError(fieldName);
                }

                field = 0;
            }
            formattedValue = (Math.round((parseFloat(field) || 0) * Math.pow(10, decimals))).toString();

            if (formattedValue.length > length) {
                formattedValue = formattedValue.slice(-length);
            } else {
                formattedValue = formattedValue.padStart(length, '0');
            }
            break;

        case "text":
            if (!field) {
                if (mandatory) {
                    throw new FieldValidationError(fieldName);
                }

                field = ""
            }

            field = String(field);

            if (field.length > length) {
                formattedValue = field.slice(-length);
            } else {
                formattedValue = field.padEnd(length, ' ');
            }

            break;

        case "date":
            try {
                formattedValue = dateToAAMMGG(field, length, mandatory);
            } catch (e) {
                throw new FieldValidationError(fieldName);
            }
            break;

        default:
            throw new Error(`Unsupported type provided <<${valueType}>> for field ${fieldName}`);
    }

    return formattedValue;
}

/**
  * updateCache: Update the "cache" counter atomically. If the key contains the
  * match, it updates the counter by 1 atomically, or resets it to 0 and updates
  * the match of the model.
  * @param {Model} model: The model to query.
  * @param {Record<string, *>} key: The key of the model.
  * @param {Record<string, *>} match: The string to check equality of.
  * @returns Promise<void>
  */
async function updateCache(model, key, match) {
  const equalityCheck = {
    $and: Object.keys(match).map(key => ({
      $eq: [`$${key}`, match[key]],
    }))
  };

  await model.findOneAndUpdate(
    key,
    [{
      $set: {
        ...match,
        'counter': {
          $cond: {
            if: equalityCheck,
            then: {
              $add: [`$counter`, 1],
            },
            else: 0,
          },
        },
      },
    }],
    {
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

class FieldValidationError extends Error {
    fieldName = '';

    constructor(fieldName) {
        super(`Field is not defined: ${fieldName}`);
        this.fieldName = fieldName;
        this.name = 'FieldValidationError';
    }
}

module.exports = {
    createFile,
    getFile,
    getFiles,
    updateFile,
    deleteFile,
    getResult,
    deleteRow,
    editRow,
    addRow,
    count,
    getDataset,
    getDatasets,
};
