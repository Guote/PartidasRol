import "../../node_modules/svelte/src/internal/disclose-version.js";
import { first_child, child } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect } from "../../node_modules/svelte/src/internal/client/reactivity/effects.js";
import { push, pop, get, invalidate_inner_signals } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { comment, append, template } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { each, index } from "../../node_modules/svelte/src/internal/client/dom/blocks/each.js";
import { set_attribute } from "../../node_modules/svelte/src/internal/client/dom/elements/attributes.js";
import { init } from "../../node_modules/svelte/src/internal/client/dom/legacy/lifecycle.js";
import { derived_safe_equal } from "../../node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
import { setup_stores, store_get, invalidate_store } from "../../node_modules/svelte/src/internal/client/reactivity/store.js";
import Group from "../ui/group.svelte.js";
import Spell from "./spell.svelte.js";
var root_2 = template(`<div class="spell-row"><!></div>`);
function SpellBoard($$anchor, $$props) {
  push($$props, false);
  const $$stores = setup_stores();
  const $data = () => store_get(data(), "$data", $$stores);
  let data = prop($$props, "data", 8);
  const i18n = game.i18n;
  init();
  var title = derived_safe_equal(() => i18n.localize("anima.ui.mystic.spells.title"));
  {
    const body = ($$anchor2) => {
      var fragment_1 = comment();
      var node = first_child(fragment_1);
      each(node, 1, () => $data().actor.system.mystic.spells, index, ($$anchor3, spell, $$index) => {
        var div = root_2();
        var node_1 = child(div);
        Spell(node_1, {
          get spell() {
            return $data().actor.system.mystic.spells[$$index];
          },
          set spell($$value) {
            $data().actor.system.mystic.spells[$$index] = $$value, invalidate_inner_signals(() => $data().actor.system.mystic.spells), invalidate_store($$stores, "$data");
          },
          contractible: true,
          isInner: true,
          $$legacy: true
        });
        template_effect(() => set_attribute(div, "data-item-id", $data().actor.system.mystic.spells[$$index]._id));
        append($$anchor3, div);
      });
      append($$anchor2, fragment_1);
    };
    Group($$anchor, {
      cssClass: "spells",
      get title() {
        return get(title);
      },
      addRowButtonData: "add-spell",
      body,
      $$slots: { body: true }
    });
  }
  pop();
}
export {
  SpellBoard as default
};
