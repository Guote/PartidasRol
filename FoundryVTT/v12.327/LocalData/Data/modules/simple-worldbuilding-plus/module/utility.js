export class SwpUtility {

  /**
   * Replace referenced data attributes in the roll formula with the syntax `@attr` with the corresponding key from
   * the provided `data` object.
   * @param {String} formula    The original formula within which to replace
   * @private
   */
  static _replaceData(formula, data) {
    let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
    let rollFormula = formula.replace(dataRgx, (match, term) => {
      // Initialize value to 0 as a fallback.
      let value = "0";
      // Try to retrieve the property value. If that values, check to see if
      // `.value` was the suffix.
      try {
        value = getProperty(data, term);
      } catch (error) {
        value = getProperty(data, term.replace('.value', ''));
      }
      return value ? String(value).trim() : "0";
    });

    return Roll.replaceFormulaData(rollFormula, data);
  }
}