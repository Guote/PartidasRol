const Logger = {
  debug(...args) {
    console.debug("AnimaBF |", ...args);
  },
  log(...args) {
    console.log("AnimaBF |", ...args);
  },
  warn(...args) {
    console.warn("AnimaBF |", ...args);
  },
  error(...args) {
    console.error("AnimaBF |", ...args);
  }
};
export {
  Logger
};
