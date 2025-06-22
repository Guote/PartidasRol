import "../../node_modules/svelte/src/internal/disclose-version.js";
import { first_child, sibling, child } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect, effect } from "../../node_modules/svelte/src/internal/client/reactivity/effects.js";
import { mutable_state, set } from "../../node_modules/svelte/src/internal/client/reactivity/sources.js";
import { set_text } from "../../node_modules/svelte/src/internal/client/render.js";
import { push, get, pop, invalidate_inner_signals } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { if_block } from "../../node_modules/svelte/src/internal/client/dom/blocks/if.js";
import { each, index } from "../../node_modules/svelte/src/internal/client/dom/blocks/each.js";
import { comment, append, template } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { slot } from "../../node_modules/svelte/src/internal/client/dom/blocks/slot.js";
import { action } from "../../node_modules/svelte/src/internal/client/dom/elements/actions.js";
import { set_attribute } from "../../node_modules/svelte/src/internal/client/dom/elements/attributes.js";
import { set_class, toggle_class } from "../../node_modules/svelte/src/internal/client/dom/elements/class.js";
import { event } from "../../node_modules/svelte/src/internal/client/dom/elements/events.js";
import { set_style } from "../../node_modules/svelte/src/internal/client/dom/elements/style.js";
import { bind_select_value } from "../../node_modules/svelte/src/internal/client/dom/elements/bindings/select.js";
import { init } from "../../node_modules/svelte/src/internal/client/dom/legacy/lifecycle.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
var root_1 = template(`<p class="label"> </p>`);
var root_2 = template(`<input class="input" type="text">`);
var root_5 = template(`<option> </option>`);
var root_7 = template(`<option> </option>`);
var root_3 = template(`<select class="input"><!><!></select>`);
var root = template(`<div><!> <!></div>`);
function CustomSelect($$anchor, $$props) {
  push($$props, false);
  let vertical = prop($$props, "vertical", 8, false);
  let cssClass = prop($$props, "cssClass", 8, "");
  let title = prop($$props, "title", 8, void 0);
  let name = prop($$props, "name", 8, void 0);
  let disabled = prop($$props, "disabled", 8, false);
  let value = prop($$props, "value", 12);
  let choices = prop($$props, "choices", 8, void 0);
  let localize = prop($$props, "localize", 8, true);
  let allowCustom = prop($$props, "allowCustom", 8, false);
  const i18n = game.i18n;
  let customInput = mutable_state(false);
  let inputWidth = mutable_state();
  function inputInit(el) {
    el.value = "";
    el.focus();
  }
  function onSelectChange(event2) {
    const selectElement = event2.target;
    set(inputWidth, selectElement?.offsetWidth);
    if (selectElement?.value === "custom") {
      set(customInput, true);
    }
  }
  function onInputBlur(event2) {
    let inputValue = event2.target.value;
    if (inputValue === "") {
      value("custom");
      set(customInput, false);
    } else {
      value(inputValue);
    }
  }
  function onInputKeyup(event2) {
    if (["Esc", "Escape"].includes(event2.key)) {
      value("custom");
      set(customInput, false);
    }
  }
  init();
  var div = root();
  var node = child(div);
  if_block(node, title, ($$anchor2) => {
    var p = root_1();
    var text = child(p);
    template_effect(() => set_text(text, title()));
    append($$anchor2, p);
  });
  var node_1 = sibling(node, 2);
  if_block(
    node_1,
    () => get(customInput),
    ($$anchor2) => {
      var input = root_2();
      template_effect(() => set_style(input, "width", `${get(inputWidth)}px`));
      action(input, ($$node) => inputInit($$node));
      effect(() => event("blur", input, onInputBlur));
      effect(() => event("keyup", input, onInputKeyup));
      append($$anchor2, input);
    },
    ($$anchor2) => {
      var select = root_3();
      template_effect(() => {
        value();
        invalidate_inner_signals(() => {
          name();
          disabled();
          choices();
          localize();
          allowCustom();
        });
      });
      var node_2 = child(select);
      if_block(
        node_2,
        choices,
        ($$anchor3) => {
          var fragment = comment();
          var node_3 = first_child(fragment);
          each(node_3, 1, () => Object.entries(choices()), index, ($$anchor4, $$item) => {
            let choice = () => get($$item)[0];
            let label = () => get($$item)[1];
            var option = root_5();
            var option_value = {};
            var text_1 = child(option);
            template_effect(() => set_text(text_1, localize() ? i18n.localize(label()) : label()));
            template_effect(() => {
              if (option_value !== (option_value = choice())) {
                option.value = null == (option.__value = choice()) ? "" : choice();
              }
            });
            append($$anchor4, option);
          });
          append($$anchor3, fragment);
        },
        ($$anchor3) => {
          var fragment_1 = comment();
          var node_4 = first_child(fragment_1);
          slot(node_4, $$props, "default", {});
          append($$anchor3, fragment_1);
        }
      );
      var node_5 = sibling(node_2);
      if_block(node_5, allowCustom, ($$anchor3) => {
        var option_1 = root_7();
        option_1.value = null == (option_1.__value = "custom") ? "" : "custom";
        var text_2 = child(option_1);
        template_effect(() => set_text(text_2, i18n.localize("dialogs.select.custom")));
        append($$anchor3, option_1);
      });
      template_effect(() => {
        set_attribute(select, "name", name());
        select.disabled = disabled();
      });
      bind_select_value(select, value);
      event("change", select, onSelectChange);
      append($$anchor2, select);
    }
  );
  template_effect(() => {
    set_class(div, `common-titled-input ${cssClass() ?? ""}`);
    toggle_class(div, "vertical", vertical());
  });
  append($$anchor, div);
  pop();
}
export {
  CustomSelect as default
};
