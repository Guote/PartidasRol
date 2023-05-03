export const logicHBSHelper = {
  name: "logic",
  fn: (v1, operator, v2, options) => {
    const getTruthyFn = () => {
      return options.fn?.(this) ?? true;
    };
    const getFalsyFn = () => {
      return options.inverse?.(this) ?? false;
    };
    switch (operator) {
      case "==":
        return v1 == v2 ? getTruthyFn() : getFalsyFn();
      case "===":
        return v1 === v2 ? getTruthyFn() : getFalsyFn();
      case "<":
        return v1 < v2 ? getTruthyFn() : getFalsyFn();
      case "<=":
        return v1 <= v2 ? getTruthyFn() : getFalsyFn();
      case ">":
        return v1 > v2 ? getTruthyFn() : getFalsyFn();
      case ">=":
        return v1 >= v2 ? getTruthyFn() : getFalsyFn();
      case "&&":
        return v1 && v2 ? getTruthyFn() : getFalsyFn();
      case "||":
        return v1 || v2 ? getTruthyFn() : getFalsyFn();
      default:
        return options.inverse(this);
    }
  },
};
