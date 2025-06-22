import "../../node_modules/svelte/src/internal/disclose-version.js";
import { child, sibling, first_child } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect } from "../../node_modules/svelte/src/internal/client/reactivity/effects.js";
import { push, pop, get } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { set_text } from "../../node_modules/svelte/src/internal/client/render.js";
import { if_block } from "../../node_modules/svelte/src/internal/client/dom/blocks/if.js";
import { append, template, comment } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { snippet } from "../../node_modules/svelte/src/internal/client/dom/blocks/snippet.js";
import { set_attribute } from "../../node_modules/svelte/src/internal/client/dom/elements/attributes.js";
import { set_class, toggle_class } from "../../node_modules/svelte/src/internal/client/dom/elements/class.js";
import { delegate } from "../../node_modules/svelte/src/internal/client/dom/elements/events.js";
import { derived } from "../../node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
var root_1 = template(`<h3 class="group-header-title"> </h3>`);
var on_click = (_, contracted) => contracted(!contracted());
var root_2 = template(`<i></i>`);
var root_4 = template(`<img src="/systems/animabf/assets/icons/game-icons.net/ffffff/sbed/add.svg" alt="Add row button">`);
var root_5 = template(`<div><!></div>`);
var root = template(`<div><div class="group-buttons"><!> <!></div> <div><!> <!></div>  <div><!></div>  <!></div>`);
function Group($$anchor, $$props) {
  push($$props, true);
  const default_header = ($$anchor2) => {
    var h3 = root_1();
    var text = child(h3);
    template_effect(() => set_text(text, $$props.title));
    append($$anchor2, h3);
  };
  let addRowButtonData = prop($$props, "addRowButtonData", 3, void 0), addRowButtonClass = prop($$props, "addRowButtonClass", 3, ""), cssClass = prop($$props, "cssClass", 3, ""), contracted = prop($$props, "contracted", 15, void 0), header = prop($$props, "header", 3, default_header);
  let contractible = derived(() => contracted() !== void 0);
  var div = root();
  var div_1 = child(div);
  var node = child(div_1);
  if_block(node, () => get(contractible), ($$anchor2) => {
    var i = root_2();
    i.__click = [on_click, contracted];
    template_effect(() => set_class(i, `fas fa-fw fa-chevron-${(contracted() ? "down" : "up") ?? ""}`));
    append($$anchor2, i);
  });
  var node_1 = sibling(node, 2);
  if_block(node_1, () => $$props.buttons, ($$anchor2) => {
    var fragment = comment();
    var node_2 = first_child(fragment);
    snippet(node_2, () => $$props.buttons);
    append($$anchor2, fragment);
  });
  var div_2 = sibling(div_1, 2);
  var node_3 = child(div_2);
  if_block(node_3, addRowButtonData, ($$anchor2) => {
    var img = root_4();
    template_effect(() => {
      set_class(img, `${addRowButtonClass() ?? ""} add-button`);
      set_attribute(img, "data-on-click", addRowButtonData());
    });
    append($$anchor2, img);
  });
  var node_4 = sibling(node_3, 2);
  snippet(node_4, header);
  var div_3 = sibling(div_2, 2);
  var node_5 = child(div_3);
  snippet(node_5, () => $$props.body);
  var node_6 = sibling(div_3, 2);
  if_block(node_6, () => $$props.footer, ($$anchor2) => {
    var div_4 = root_5();
    var node_7 = child(div_4);
    snippet(node_7, () => $$props.footer);
    template_effect(() => set_class(div_4, `group-footer ${cssClass() ?? ""}`));
    append($$anchor2, div_4);
  });
  template_effect(() => {
    set_class(div, `common-group ${cssClass() ?? ""}`);
    toggle_class(div, "contractible-group", get(contractible));
    toggle_class(div, "contracted", contracted());
    set_class(div_2, `group-header ${cssClass() ?? ""}`);
    set_attribute(div_3, "id", `${cssClass() ?? ""}-context-menu-container`);
    set_class(div_3, `group-body ${cssClass() ?? ""}`);
  });
  append($$anchor, div);
  pop();
}
delegate(["click"]);
export {
  Group as default
};
