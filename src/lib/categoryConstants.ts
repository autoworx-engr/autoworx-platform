/**
 * Category names are shown untruncated in dropdown rows and chips, so an
 * unbounded name breaks those layouts. Enforced on the inputs and again in the
 * server action and API route, since either can be called directly.
 */
export const CATEGORY_NAME_MAX_LENGTH = 100;
