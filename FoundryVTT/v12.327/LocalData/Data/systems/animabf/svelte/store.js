import { writable } from "../node_modules/svelte/src/store/shared/index.js";
function debouncedStore(value) {
  const store = writable(value);
  let timeoutIDs = [];
  return {
    ...store,
    debounceSubscribe(fn, timeout = 500) {
      let id = timeoutIDs.length;
      return store.subscribe((v) => {
        clearTimeout(timeoutIDs[id]);
        timeoutIDs[id] = setTimeout(() => {
          fn(v);
        }, timeout);
      });
    }
  };
}
export {
  debouncedStore
};
