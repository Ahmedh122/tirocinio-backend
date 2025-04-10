/**
 * @function groupsIntersect
 * @param {Array<*>} adGroupsA The first array of adgroups
 * @param {Array<*>} adGroupsB The second array of adgroups
 *
 * @returns {boolean} Whether or not the two arrays have an ad group in common.
 */
function groupsIntersect(adGroupsA, adGroupsB) {
  for (const group of adGroupsA) {
    const common = adGroupsB.filter(
      (iterGroup) => iterGroup.guid === group.guid
    );
    if (common.length > 0) {
      return true;
    }
  }

  return false;
}

module.exports = {
  groupsIntersect,
};
