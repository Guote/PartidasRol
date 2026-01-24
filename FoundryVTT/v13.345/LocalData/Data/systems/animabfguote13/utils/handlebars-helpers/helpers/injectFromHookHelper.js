const injectFromHookHelper = {
  name: "injectFromHook",
  fn: function(hookName, ...args) {
    args.pop();
    const injectionParts = [];
    Hooks.call(hookName, ...args, injectionParts);
    return injectionParts.join("\n");
  }
};
export {
  injectFromHookHelper
};
