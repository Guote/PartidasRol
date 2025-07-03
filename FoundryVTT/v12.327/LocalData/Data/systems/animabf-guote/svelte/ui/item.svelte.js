import "../../node_modules/svelte/src/internal/disclose-version.js";
import { first_child, sibling } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { user_effect } from "../../node_modules/svelte/src/internal/client/reactivity/effects.js";
import { state, set } from "../../node_modules/svelte/src/internal/client/reactivity/sources.js";
import { push, pop, get } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { delegate } from "../../node_modules/svelte/src/internal/client/dom/elements/events.js";
import { text, append, comment, template } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { if_block } from "../../node_modules/svelte/src/internal/client/dom/blocks/if.js";
import { proxy } from "../../node_modules/svelte/src/internal/client/proxy.js";
import { derived } from "../../node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
import Group from "./group.svelte.js";
import { Logger } from "../../utils/log.js";
import { ABFDialogs } from "../../module/dialogs/ABFDialogs.js";
function onDelete(_, $$props, i18n) {
  if (!$$props.item.parent) {
    Logger.warn(`Cannot delete ${$$props.item.type}: item.parent is undefined.`);
    return;
  }
  ABFDialogs.confirm(i18n.localize("dialogs.items.delete.title"), i18n.localize("dialogs.items.delete.body"), {
    onConfirm: () => {
      if (!$$props.item.id) {
        Logger.warn(`Cannot delete ${$$props.item.type}: item.id is ${$$props.item.id}.`);
        return;
      }
      $$props.item.parent?.deleteEmbeddedDocuments("Item", [$$props.item.id]);
    }
  });
}
var on_click = (_, $$props) => $$props.item.sheet?.render(true);
var root_2 = template(`<i class="fas fa-fw fa-edit"></i> <i class="fas fa-fw fa-trash"></i>`, 1);
function Item($$anchor, $$props) {
  push($$props, true);
  let isInner = prop($$props, "isInner", 3, false), contractible = prop($$props, "contractible", 11, false), cssClass = prop($$props, "cssClass", 3, "");
  let contracted = state(proxy(contractible() ? (
    /** @type {boolean} */
    $$props.item.getFlag("animabf-guote", "contracted") || false
  ) : void 0));
  user_effect(() => {
    if (!contractible()) return;
    $$props.item.setFlag("animabf-guote", "contracted", get(contracted));
  });
  user_effect(() => onItemChange($$props.item));
  function onItemChange(item) {
    if (!isInner() || !item.parent) return;
    const { _id, name, img, system } = item;
    item.parent.updateEmbeddedDocuments("Item", [{ _id, name, img, system }], { render: false });
  }
  const i18n = game.i18n;
  var title = derived(() => $$props.item.name || "");
  {
    const buttons = ($$anchor2) => {
      var fragment_1 = comment();
      var node = first_child(fragment_1);
      if_block(node, isInner, ($$anchor3) => {
        var fragment_2 = root_2();
        var i = first_child(fragment_2);
        i.__click = [on_click, $$props];
        var i_1 = sibling(i, 2);
        i_1.__click = [onDelete, $$props, i18n];
        append($$anchor3, fragment_2);
      });
      append($$anchor2, fragment_1);
    };
    Group($$anchor, {
      get title() {
        return get(title);
      },
      get contracted() {
        return get(contracted);
      },
      set contracted($$value) {
        set(contracted, proxy($$value));
      },
      get cssClass() {
        return cssClass();
      },
      get header() {
        return $$props.header;
      },
      get body() {
        return $$props.body;
      },
      get footer() {
        return $$props.footer;
      },
      buttons,
      children: ($$anchor2, $$slotProps) => {
        var text$1 = text(">");
        append($$anchor2, text$1);
      },
      $$slots: { buttons: true, default: true }
    });
  }
  pop();
}
delegate(["click"]);
export {
  Item as default
};
