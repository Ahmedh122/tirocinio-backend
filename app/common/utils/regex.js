/**
 * escapeRegexString: Escapes a string to generate a valid regex.
 * Useful for safely querying mongo without causing errors.
 * @param {String} string: The string to escape.
 * @returns {String} The escaped string.
 */
function escapeRegexString(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  escapeRegexString,
};
