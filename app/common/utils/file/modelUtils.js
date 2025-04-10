/**
 * @fileoverview Utility methods to handle the file - filetype cases.
 * This file provides utilities such as:
 * - getFileField: Get the value of a file based on its filetype's FIELD;
 * - extractPathFromFileType: Get the [path, label] parts for a file from a
 *   filetype.
 */

/**
 * @function getFileField: Get the value of a field, or return undefined.
 *
 * @param {File} file: The file to get its value from.
 * @param {FileType} fileType: The filetype to look.
 * @param {string} field: The name of the field to get.
 *
 * @returns {string | undefined} The extracted value.
 */

function getFileField(file, fileType, field) {
  const path = extractPathFromFileType(fileType, field);
  if (!path) {
    return undefined;
  }

  return file[path[0]][path[1]];
}

/**
 * @function extractPathFromFileType: Extract the path and label from a
 * FileType. This is used in order to get the value to be used by a file.
 *
 * @param {FileType} fileType: The filetype to look.
 * @param {string} fieldName: The name of the field.
 *
 * @returns {[string, string] | undefined} Extracted values, or undefined if not found.
 */
function extractPathFromFileType(fileType, fieldName) {
  for (const groupKey in fileType.model.Intestazioni) {
    const group = fileType.model.Intestazioni[groupKey];

    for (const fieldKey in group.campi) {
      const field = group.campi[fieldKey];
      if (field.field.toLowerCase().trim() === fieldName.toLowerCase().trim()) {
        return [field.path, field.field];
      }
    }
  }

  return undefined;
}

/**
 * @function mergeFieldsAndSchema: Get a unified overview of a model by merging
 * the schema and the value.
 *
 * @param {File} file: The file to scan. This should contain the merged output
 * between result and edited in the "result" key.
 * @param {FileType} fileType: The schema.
 *
 * @returns {Array<{"type": string, value: string, mandatory: boolean, config: Object | undefined}>} The returned result.
 */
function mergeFieldsAndSchema(file, fileType) {
  const output = [];

  for (const groupKey in fileType.model.Intestazioni) {
    const group = fileType.model.Intestazioni[groupKey];

    for (const fieldKey in group.campi) {
      const field = group.campi[fieldKey];
      output.push({
        ...field,
        value: file.result[field.path][field.field] || null,
      });
    }
  }

  return output;
}

module.exports = {
  getFileField,
  extractPathFromFileType,
  mergeFieldsAndSchema,
};
