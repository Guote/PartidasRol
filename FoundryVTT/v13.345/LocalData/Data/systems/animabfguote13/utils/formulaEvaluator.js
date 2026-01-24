class FormulaEvaluator {
  /**
   * Eval numeric formula using actor data paths.
   * Supports @paths like:
   *  - @characteristics.primaries.power.mod
   *  - @system.characteristics.primaries.power.mod
   * No dice allowed here.
   *
   * @param {string} formula
   * @param {Actor|null} actor
   * @returns {number|null}
   */
  static evaluate(formula, actor = null) {
    const clean = (formula ?? "").trim();
    if (!clean) return null;
    if (/[dD]\d+/.test(clean)) {
      console.warn("FormulaEvaluator: dice are not allowed inside @formula:", clean);
      return null;
    }
    const ctx = actor?.system ? foundry.utils.duplicate(actor.system) : {};
    ctx.system = ctx;
    try {
      const replaced = clean.replace(/@([a-zA-Z0-9_.]+)/g, (match, path) => {
        const value = foundry.utils.getProperty(ctx, path);
        const num = Number(value);
        return Number.isFinite(num) ? String(num) : "0";
      });
      const compact = replaced.replace(/\s+/g, "");
      if (!/^[0-9+\-*/().]*$/.test(compact)) {
        console.error("FormulaEvaluator: invalid chars after replace", {
          original: clean,
          replaced
        });
        return null;
      }
      const total = Roll.safeEval(replaced);
      return Number.isFinite(total) ? total : null;
    } catch (err) {
      console.error("FormulaEvaluator error evaluating formula:", {
        formula: clean,
        err
      });
      return null;
    }
  }
}
export {
  FormulaEvaluator
};
