export class SwpUtility {
  replaceBracketAttributes(content = '', data = {}) {
    if (content.length < 1) {
      return '';
    }

    let regex = /(\{\{)(\/[a-zA-Z]+\s)?([^\}]+)(\}\})/gi;
    let result = content.replace(regex, (match, p1, p2, p3, p4) => {
      // Handle deferred rolls.
      if (p2 && p2.includes('/r')) {
        let label = p3.split('#');
        return `<a class="inline-roll-plus" data-roll="${label[1] ? label[0] + '#' + label[1] : label[0]}"><i class="fa fa-dice-d20"></i> ${label[2] ? label[2] : label[0]}</a>`;
      }
      // Handle immediate rolls.
      else {
        const replacement = SwpUtility._replaceData(p3, data);
        return `<span class="inline-result-plus">${replacement}</span>`;
      }
    });
    return result;
  }

  /**
   * Strip formula of characters that would cause issues during parsing.
   * @param {String} formula
   */
  static _sanitizeFormula(formula) {
    let origFormula = formula;
    formula = formula.split('</')[0];
    formula = formula.split('||')[0];
    formula = formula.split('{{')[0];
    formula = formula.split('[[')[0];
    let regex = /<[^>]*>/g;
    formula = formula.replace(regex, '');

    // Tell the user if there's a problem.
    if (origFormula != formula) {
      ui.notifications.warn(`<span class="swp-warning">The following formula in your character sheet has a problem in its syntax and had to be sanitized. Please review your character sheet and make adjustments as needed: ${origFormula.replace(regex, '')}</span>`);
    }

    return formula;
  }

  /**
   * Replace referenced data attributes in the roll formula with the syntax `@attr` with the corresponding key from
   * the provided `data` object.
   * @param {String} formula    The original formula within which to replace
   * @private
   */
  static _replaceData(formula, data) {
    formula = this._sanitizeFormula(formula);
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

    // Use the roll class to calculate.
    let r = new Roll(rollFormula, data);
    // Try to evaluate the roll, otherwise return the value directly.
    try {
      r.evaluate({async: false});
    } catch (error) {
      return r.formula;
    }
    // Return the total if the roll was successful.
    return r.total;
  }
}