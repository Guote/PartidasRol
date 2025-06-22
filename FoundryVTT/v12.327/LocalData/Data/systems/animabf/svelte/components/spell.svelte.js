import "../../node_modules/svelte/src/internal/disclose-version.js";
import { child, sibling } from "../../node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect } from "../../node_modules/svelte/src/internal/client/reactivity/effects.js";
import { push, pop, get } from "../../node_modules/svelte/src/internal/client/runtime.js";
import { set_text } from "../../node_modules/svelte/src/internal/client/render.js";
import { each, index } from "../../node_modules/svelte/src/internal/client/dom/blocks/each.js";
import { append, template } from "../../node_modules/svelte/src/internal/client/dom/template.js";
import { set_class } from "../../node_modules/svelte/src/internal/client/dom/elements/class.js";
import { derived } from "../../node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { prop } from "../../node_modules/svelte/src/internal/client/reactivity/props.js";
import Item from "../ui/item.svelte.js";
import TitledInput from "../ui/titledInput.svelte.js";
import CustomSelect from "../ui/customSelect.svelte.js";
import Editor_1 from "../ui/editor.svelte.js";
import { ABFConfig } from "../../module/ABFConfig.js";
import "../../node_modules/jquery/dist/jquery.js";
var root_1 = template(`<div class="spell-header"><div class="first-row"><!></div> <div class="second-row"><!> <!> <!> <!></div></div>`);
var root_3 = template(`<div><p class="label grade-name"> </p> <!> <!> <!> <!></div>`);
var root_2 = template(`<div><!> <!> <div class="description"><p class="label"> </p> <!></div></div>`);
var root_4 = template(`<div class="spell-footer"><!> <!> <!> <!></div>`);
function Spell($$anchor, $$props) {
  push($$props, true);
  let contractible = prop($$props, "contractible", 3, false), spell = prop($$props, "spell", 15);
  let i18n = game.i18n;
  const { iterables } = ABFConfig;
  const grades = [
    "base",
    "intermediate",
    "advanced",
    "arcane"
  ];
  {
    const header = ($$anchor2) => {
      var div = root_1();
      var div_1 = child(div);
      var node = child(div_1);
      TitledInput(node, {
        cssClass: "name",
        type: "text",
        get value() {
          return spell().name;
        },
        set value($$value) {
          spell(spell().name = $$value, true);
        }
      });
      var div_2 = sibling(div_1, 2);
      var node_1 = child(div_2);
      var title = derived(() => i18n.localize("anima.ui.mystic.spell.level.title"));
      TitledInput(node_1, {
        cssClass: "level",
        get title() {
          return get(title);
        },
        get value() {
          return spell().system.level.value;
        },
        set value($$value) {
          spell(spell().system.level.value = $$value, true);
        }
      });
      var node_2 = sibling(node_1, 2);
      var title_1 = derived(() => i18n.localize("anima.ui.mystic.spell.visible.title"));
      TitledInput(node_2, {
        type: "checkbox",
        cssClass: "visible",
        get title() {
          return get(title_1);
        },
        get value() {
          return spell().system.visible;
        },
        set value($$value) {
          spell(spell().system.visible = $$value, true);
        }
      });
      var node_3 = sibling(node_2, 2);
      var title_2 = derived(() => i18n.localize("anima.ui.mystic.spell.combatType.title"));
      CustomSelect(node_3, {
        cssClass: "combat-type",
        get title() {
          return get(title_2);
        },
        get value() {
          return spell().system.combatType.value;
        },
        set value($$value) {
          spell(spell().system.combatType.value = $$value, true);
        },
        get choices() {
          return iterables.mystic.combatTypes;
        }
      });
      var node_4 = sibling(node_3, 2);
      var title_3 = derived(() => i18n.localize("anima.ui.mystic.spell.via.title"));
      CustomSelect(node_4, {
        cssClass: "via",
        get title() {
          return get(title_3);
        },
        get value() {
          return spell().system.via.value;
        },
        set value($$value) {
          spell(spell().system.via.value = $$value, true);
        },
        get choices() {
          return iterables.mystic.vias;
        },
        allowCustom: true
      });
      append($$anchor2, div);
    };
    const body = ($$anchor2) => {
      var div_3 = root_2();
      var node_5 = child(div_3);
      each(node_5, 17, () => grades, index, ($$anchor3, grade) => {
        var div_4 = root_3();
        var p = child(div_4);
        var text = child(p);
        template_effect(() => set_text(text, i18n.localize(`anima.ui.mystic.spell.grade.${get(grade)}.title`)));
        var node_6 = sibling(p, 2);
        var title_4 = derived(() => get(grade) === "base" ? i18n.localize("anima.ui.mystic.spell.grade.intRequired.title") : void 0);
        TitledInput(node_6, {
          cssClass: "int-required",
          vertical: true,
          get title() {
            return get(title_4);
          },
          get value() {
            return spell().system.grades[get(grade)].intRequired.value;
          },
          set value($$value) {
            spell(spell().system.grades[get(grade)].intRequired.value = $$value, true);
          }
        });
        var node_7 = sibling(node_6, 2);
        var title_5 = derived(() => get(grade) === "base" ? i18n.localize("anima.ui.mystic.spell.grade.zeon.title") : void 0);
        TitledInput(node_7, {
          cssClass: "zeon",
          vertical: true,
          get title() {
            return get(title_5);
          },
          get value() {
            return spell().system.grades[get(grade)].zeon.value;
          },
          set value($$value) {
            spell(spell().system.grades[get(grade)].zeon.value = $$value, true);
          }
        });
        var node_8 = sibling(node_7, 2);
        var title_6 = derived(() => get(grade) === "base" ? i18n.localize("anima.ui.mystic.spell.grade.maintenanceCost.title") : void 0);
        TitledInput(node_8, {
          cssClass: "maintenance-cost",
          vertical: true,
          get title() {
            return get(title_6);
          },
          get value() {
            return spell().system.grades[get(grade)].maintenanceCost.value;
          },
          set value($$value) {
            spell(spell().system.grades[get(grade)].maintenanceCost.value = $$value, true);
          }
        });
        var node_9 = sibling(node_8, 2);
        var title_7 = derived(() => get(grade) === "base" ? i18n.localize("anima.ui.mystic.spell.grade.description.title") : void 0);
        TitledInput(node_9, {
          cssClass: "grade-description",
          vertical: true,
          get title() {
            return get(title_7);
          },
          type: "text",
          get value() {
            return spell().system.grades[get(grade)].description.value;
          },
          set value($$value) {
            spell(spell().system.grades[get(grade)].description.value = $$value, true);
          }
        });
        template_effect(() => set_class(div_4, `${get(grade) ?? ""}-grade grade-row`));
        append($$anchor3, div_4);
      });
      var node_10 = sibling(node_5, 2);
      TitledInput(node_10, {
        cssClass: "macro",
        title: "Macro",
        type: "text",
        get value() {
          return spell().system.macro;
        },
        set value($$value) {
          spell(spell().system.macro = $$value, true);
        }
      });
      var div_5 = sibling(node_10, 2);
      var p_1 = child(div_5);
      var text_1 = child(p_1);
      template_effect(() => set_text(text_1, i18n.localize("anima.ui.mystic.spell.grade.description.title")));
      var node_11 = sibling(p_1, 2);
      Editor_1(node_11, {
        get value() {
          return spell().system.description.value;
        },
        set value($$value) {
          spell(spell().system.description.value = $$value, true);
        },
        owner: true
      });
      append($$anchor2, div_3);
    };
    const footer = ($$anchor2) => {
      var div_6 = root_4();
      var node_12 = child(div_6);
      var title_8 = derived(() => i18n.localize("anima.ui.mystic.spell.spellType.title"));
      CustomSelect(node_12, {
        cssClass: "spell-type",
        get title() {
          return get(title_8);
        },
        get value() {
          return spell().system.spellType.value;
        },
        set value($$value) {
          spell(spell().system.spellType.value = $$value, true);
        },
        get choices() {
          return iterables.mystic.spellTypes;
        }
      });
      var node_13 = sibling(node_12, 2);
      var title_9 = derived(() => i18n.localize("anima.ui.mystic.spell.actionType.title"));
      CustomSelect(node_13, {
        cssClass: "action-type",
        get title() {
          return get(title_9);
        },
        get value() {
          return spell().system.actionType.value;
        },
        set value($$value) {
          spell(spell().system.actionType.value = $$value, true);
        },
        get choices() {
          return iterables.mystic.actionTypes;
        }
      });
      var node_14 = sibling(node_13, 2);
      var title_10 = derived(() => i18n.localize("anima.ui.mystic.spell.critic.title"));
      CustomSelect(node_14, {
        cssClass: "critic",
        get title() {
          return get(title_10);
        },
        get choices() {
          return iterables.combat.weapon.criticTypesWithNone;
        },
        get value() {
          return spell().system.critic.value;
        },
        set value($$value) {
          spell(spell().system.critic.value = $$value, true);
        }
      });
      var node_15 = sibling(node_14, 2);
      var title_11 = derived(() => i18n.localize("anima.ui.mystic.spell.hasDailyMaintenance.title"));
      TitledInput(node_15, {
        cssClass: "has-daily-maintenance",
        get title() {
          return get(title_11);
        },
        type: "checkbox",
        get value() {
          return spell().system.hasDailyMaintenance.value;
        },
        set value($$value) {
          spell(spell().system.hasDailyMaintenance.value = $$value, true);
        }
      });
      append($$anchor2, div_6);
    };
    Item($$anchor, {
      get item() {
        return spell();
      },
      set item($$value) {
        spell($$value);
      },
      cssClass: "spell-svelte",
      get isInner() {
        return $$props.isInner;
      },
      get contractible() {
        return contractible();
      },
      header,
      body,
      footer,
      $$slots: { header: true, body: true, footer: true }
    });
  }
  pop();
}
export {
  Spell as default
};
