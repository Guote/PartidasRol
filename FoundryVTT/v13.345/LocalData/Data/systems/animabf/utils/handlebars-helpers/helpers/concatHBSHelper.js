const concatHBSHelper = {
  name: "concat",
  fn: (...args) => {
    delete args[args.length - 1];
    return args.join("");
  }
};
export {
  concatHBSHelper
};
