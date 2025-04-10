/**
 * @fileoverview This function was previously declared inside FileController.
 * It has been moved here as it seems to be needed in multiple places.
 */

/**
  * @function mergeObjects: Merge an original object with an edited object and return the result.
  * @param {Object} original The original object to merge.
  * @param {Object} edited The edited object to merge.
  * @param {Boolean?} union Add new fields if true, discard otherwise.

  * @returns {Object}
  */
function mergeObjects(original, edited, union = false) {
  // Helper function to check if an object has only one key (id)
  if (!edited || !original) {
    return edited || original;
  }

  // Helper function to check if an object has only one key (id)
  // function hasOnlyIdField(obj) {
  //     return Object.keys(obj).length === 1 && obj.hasOwnProperty('id');
  // }

  // Clone original to avoid mutating it directly
  let merged = JSON.parse(JSON.stringify(original));
  if (!merged) {
    merged = {};
  }

  // Merge non-TABELLA fields
  for (let key in edited) {
    if (key !== 'TABELLA') {
      for (let keyy in edited[key])
        if ((merged[key] && merged[key][keyy]) || union) {
          // Only add new field if union is required, discard otherwise
          if (!merged[key]) {
            merged[key] = {};
          }
          merged[key][keyy] = edited[key][keyy];
        }
    } else {
      const editedObj = {};
      for (let i = 0; i < edited['TABELLA'].length; i++) {
        const row = edited['TABELLA'][i];
        editedObj[row['id']] = row;
      }

      // We handle for collisions between edited and merged.
      for (let i = 0; i < merged['TABELLA'].length; i++) {
        const id = merged['TABELLA'][i]['id'];

        // If there is a "conflict" (i.e. the row is present in both edited and merged),
        // replace the original row with the edited row.
        // If the edited row has no fields, we assume that the row has been deleted.
        if (editedObj[id]) {
          if (Object.keys(editedObj[id]).length > 1) {
            for (let key in editedObj[id]) {
              if (merged['TABELLA'][i][key] || union) {
                merged['TABELLA'][i][key] = editedObj[id][key];
              }
            }
          }

          else {
            delete merged['TABELLA'][i];
          }

          delete editedObj[id];
        }
      }

      // We handle the rows that are present in edited but not in merged.
      // This is composed of new rows.
      // We sort the new rows by the id field reversed to ensure that the new rows
      // are added on top.
      const remainingEditedRows = Object.values(editedObj).sort((a, b) => a.id - b.id);
      for (let val of remainingEditedRows) {
        if (!Array.isArray(merged['TABELLA'])) {
          merged['TABELLA'] = [];
        }

        merged['TABELLA'].unshift(val);
      }
    }
  }

  if (merged['TABELLA']) {
    merged['TABELLA'] = merged['TABELLA'].filter((obj) => obj !== null);
  }

  return merged;
}

module.exports = {
  mergeObjects,
};
