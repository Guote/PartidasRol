/**
 * Returns the first truthy value from the arguments
 * Usage: {{or value1 value2 value3}}
 */
export const orHBSHelper = {
  name: 'or',
  fn: function(...args) {
    // Remove the Handlebars options object (last argument)
    const values = args.slice(0, -1);
    for (const val of values) {
      if (val) return val;
    }
    return values[values.length - 1] || '';
  }
};
