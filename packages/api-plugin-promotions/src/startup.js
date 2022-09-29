import { createRequire } from "module";
import Logger from "@reactioncommerce/logger";
import _ from "lodash";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const { name, version } = pkg;
const logCtx = {
  name,
  version,
  file: "startup.js"
};

/**
 * @summary get all promotions
 * @param {Object} context - The application context
 * @returns {Array<Object>} - An array of promotions
 */
async function getPromotions(context) {
  const now = new Date();
  const {
    collections: { Promotions }
  } = context;
  const promotions = await Promotions.find({
    enabled: true,
    startDate: { $lt: now },
    endDate: { $gt: now }
  }).toArray();
  Logger.info({ ...logCtx, applicablePromotions: promotions.length }, "Fetched applicable promotions");
  return promotions;
}

/**
 * @summary enhance the cart with calculated totals
 * @param {Object} context - The application context
 * @param {Array<Function>} enhancers - The enhancers to apply
 * @param {Object} cart - The cart to enhance
 * @returns {Object} - The enhanced cart
 */
function enhanceCart(context, enhancers, cart) {
  const cartForEvaluation = _.cloneDeep(cart);
  enhancers.forEach((enhancer) => {
    enhancer(context, cartForEvaluation);
  });
  return cartForEvaluation;
}

/**
 * @summary apply promotions to a cart
 * @param {Object} context - The application context
 * @param {Object} cart - The cart to apply promotions to
 * @returns {Object} - The cart with promotions applied
 */
async function applyExplicitPromotions(context, cart) {
  const promotions = await getPromotions(context);
  const { promotions: pluginPromotions } = context;

  const enhancedCart = enhanceCart(context, pluginPromotions.enhancers, cart);

  const addedPromotions = []
  for (const promotion of promotions) {
    const { triggers, actions } = promotion;
    for (const trigger of triggers) {
      const triggerFn = pluginPromotions.triggerHandlers[trigger.triggerKey];
      if (triggerFn) {
        // eslint-disable-next-line no-await-in-loop
        const shouldApply = await triggerFn(context, enhancedCart, promotion);
        if (shouldApply) {
          for (const action of actions) {
            const { actionKey, actionParameters } = action;
            const actionFn = pluginPromotions.actionHandlers[actionKey];
            if (actionFn) {
              // eslint-disable-next-line no-await-in-loop
              await actionFn(context, enhancedCart, actionParameters);
            }
          }
          break;
        }
      }
    }
  }

  context.mutations.saveCart(context, enhanceCart, "promotions");
}

/**
 * @summary Perform various scaffolding tasks on startup
 * @param {Object} context - The application context
 * @returns {Promise<void>} undefined
 */
export default async function startupPromotions(context) {
  context.appEvents.on("afterCartCreate", async (args) => {
    const { cart, emittedBy } = args;
    if (emittedBy !== "promotions") {
      await applyExplicitPromotions(context, cart);
    }
  });

  context.appEvents.on("afterCartUpdate", async (args) => {
    const { cart, emittedBy } = args;
    if (emittedBy !== "promotions") {
      await applyExplicitPromotions(context, cart);
    }
  });
}
