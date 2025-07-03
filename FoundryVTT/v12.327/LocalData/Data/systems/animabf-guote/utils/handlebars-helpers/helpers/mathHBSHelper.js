const mathHBSHelper = {
  name: "math",
  fn: (...rawArgs) => {
    const validArgs = rawArgs.filter(
      (arg) => typeof arg === "string" || typeof arg === "number"
    );
    return eval(validArgs.join(""));
  }
};
export {
  mathHBSHelper
};
