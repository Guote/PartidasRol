import "../../node_modules/svelte/src/internal/disclose-version.js";
import { push, untrack, pop } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { init } from "../../node_modules/svelte/src/internal/client/dom/legacy/lifecycle.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
import { setup_stores, store_mutate, store_get } from "../../node_modules/svelte/src/internal/client/reactivity/store.js";
import Spell from "./spell.svelte.js";
function SpellContainer($$anchor, $$props) {
  push($$props, false);
  const $$stores = setup_stores();
  const $data = () => store_get(data(), "$data", $$stores);
  let data = prop($$props, "data", 8);
  init();
  Spell($$anchor, {
    get spell() {
      return $data().item;
    },
    set spell($$value) {
      store_mutate(data(), untrack($data).item = $$value, untrack($data));
    },
    $$legacy: true
  });
  pop();
}
export {
  SpellContainer as default
};
