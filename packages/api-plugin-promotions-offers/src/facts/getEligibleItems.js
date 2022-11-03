import createEngine from "../utils/engineHelpers.js";

/**
 * @summary return items from the cart that meet inclusion criteria
 * @param {Object} context - The application context
 * @param {Object} params - The parameters to evaluate against
 * @param {Object} almanac - the rule to evaluate against
 * @return {Promise<Array<Object>>} - An array of eligible cart items
 */
export default async function getEligibleItems(context, params, almanac) {
  const getCheckMethod = (inclusionRule, exclusionRule) => {
    const includeEngine = inclusionRule ? createEngine(context, inclusionRule) : null;
    const excludeEngine = exclusionRule ? createEngine(context, exclusionRule) : null;

    return async (item) => {
      if (includeEngine) {
        const results = await includeEngine.run({ item });
        const { failureResults } = results;
        const failedIncludeTest = failureResults.length > 0;
        if (failedIncludeTest) return false;
      }

      if (excludeEngine) {
        const { failureResults } = await excludeEngine.run({ item });
        const failedExcludeTest = failureResults.length > 0;
        return failedExcludeTest;
      }

      return true;
    };
  };

  const checkerMethod = getCheckMethod(params.inclusionRule, params.exclusionRule);

  const cart = await almanac.factValue("cart");
  const eligibleItems = [];
  for (const item of cart.items) {
    // eslint-disable-next-line no-await-in-loop
    if (await checkerMethod(item)) {
      eligibleItems.push(item);
    }
  }
  return eligibleItems;
}
