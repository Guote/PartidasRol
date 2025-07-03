import "../../node_modules/svelte/src/internal/disclose-version.js";
import { first_child, child, sibling } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect } from "../../node_modules/svelte/src/internal/client/reactivity/effects.js";
import { set_text } from "../../node_modules/svelte/src/internal/client/render.js";
import { if_block } from "../../node_modules/svelte/src/internal/client/dom/blocks/if.js";
import { comment, append, template } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { toggle_class, set_class } from "../../node_modules/svelte/src/internal/client/dom/elements/class.js";
import { bind_value, bind_checked } from "../../node_modules/svelte/src/internal/client/dom/elements/bindings/input.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
var root_1 = template(`<p class="label"> </p>`);
var root_2 = template(`<input type="checkbox" class="input">`);
var root_5 = template(`<input type="text" class="input secondary-input">`);
var root_4 = template(`<input type="text" class="input"> <!>`, 1);
var root_8 = template(`<input type="number" class="input secondary-input">`);
var root_7 = template(`<input type="number" class="input"> <!>`, 1);
var root = template(`<div><!> <div class="input-container"><!></div></div>`);
function TitledInput($$anchor, $$props) {
  let cssClass = prop($$props, "cssClass", 8, "");
  let vertical = prop($$props, "vertical", 8, false);
  let title = prop($$props, "title", 8, void 0);
  let type = prop($$props, "type", 8, "number");
  let value = prop($$props, "value", 12);
  let disabled = prop($$props, "disabled", 8, false);
  let secondaryValue = prop($$props, "secondaryValue", 12, void 0);
  let secondaryEnabled = prop($$props, "secondaryEnabled", 8, false);
  var div = root();
  var node = child(div);
  if_block(node, title, ($$anchor2) => {
    var p = root_1();
    var text = child(p);
    template_effect(() => set_text(text, title()));
    append($$anchor2, p);
  });
  var div_1 = sibling(node, 2);
  var node_1 = child(div_1);
  if_block(
    node_1,
    () => type() === "checkbox",
    ($$anchor2) => {
      var input = root_2();
      template_effect(() => {
        input.disabled = disabled();
        toggle_class(input, "primary-input", secondaryValue());
      });
      bind_checked(input, value);
      append($$anchor2, input);
    },
    ($$anchor2) => {
      var fragment = comment();
      var node_2 = first_child(fragment);
      if_block(
        node_2,
        () => type() === "text",
        ($$anchor3) => {
          var fragment_1 = root_4();
          var input_1 = first_child(fragment_1);
          var node_3 = sibling(input_1, 2);
          if_block(node_3, secondaryValue, ($$anchor4) => {
            var input_2 = root_5();
            template_effect(() => input_2.disabled = !secondaryEnabled());
            bind_value(input_2, secondaryValue);
            append($$anchor4, input_2);
          });
          template_effect(() => {
            input_1.disabled = disabled();
            toggle_class(input_1, "primary-input", secondaryValue());
          });
          bind_value(input_1, value);
          append($$anchor3, fragment_1);
        },
        ($$anchor3) => {
          var fragment_2 = comment();
          var node_4 = first_child(fragment_2);
          if_block(
            node_4,
            () => type() === "number",
            ($$anchor4) => {
              var fragment_3 = root_7();
              var input_3 = first_child(fragment_3);
              var node_5 = sibling(input_3, 2);
              if_block(node_5, secondaryValue, ($$anchor5) => {
                var input_4 = root_8();
                template_effect(() => input_4.disabled = !secondaryEnabled());
                bind_value(input_4, secondaryValue);
                append($$anchor5, input_4);
              });
              template_effect(() => {
                input_3.disabled = disabled();
                toggle_class(input_3, "primary-input", secondaryValue());
              });
              bind_value(input_3, value);
              append($$anchor4, fragment_3);
            },
            null,
            true
          );
          append($$anchor3, fragment_2);
        },
        true
      );
      append($$anchor2, fragment);
    }
  );
  template_effect(() => {
    set_class(div, `${cssClass() ?? ""} common-titled-input`);
    toggle_class(div, "vertical", vertical());
    toggle_class(div_1, "big", secondaryValue());
  });
  append($$anchor, div);
}
export {
  TitledInput as default
};
