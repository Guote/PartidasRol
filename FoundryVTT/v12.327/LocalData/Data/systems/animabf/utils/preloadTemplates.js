import { Templates } from "../module/utils/constants.js";
const preloadTemplates = () => {
  const templatePaths = [
    Templates.Dialog.ModDialog,
    Templates.Dialog.DamageCalculator,
    Templates.Dialog.newSupernaturalShield.main,
    Templates.Dialog.newSupernaturalShield.parts.mystic,
    Templates.Dialog.newSupernaturalShield.parts.psychic,
    Templates.Dialog.Combat.CombatAttackDialog.main,
    Templates.Dialog.Combat.CombatAttackDialog.parts.combat,
    Templates.Dialog.Combat.CombatAttackDialog.parts.mystic,
    Templates.Dialog.Combat.CombatAttackDialog.parts.psychic,
    Templates.Dialog.Combat.CombatDefenseDialog.main,
    Templates.Dialog.Combat.CombatDefenseDialog.parts.combat,
    Templates.Dialog.Combat.CombatDefenseDialog.parts.damageResistance,
    Templates.Dialog.Combat.CombatDefenseDialog.parts.mystic,
    Templates.Dialog.Combat.CombatDefenseDialog.parts.psychic,
    Templates.Dialog.Combat.CombatRequestDialog,
    Templates.Dialog.Combat.GMCombatDialog,
    Templates.Dialog.Icons.Accept,
    Templates.Dialog.Icons.Cancel,
    Templates.CustomHotBar,
    Templates.Chat.CombatResult,
    Templates.Svelte.SvelteApp,
    // Common parts
    "systems/animabf/templates/common/ui/horizontal-titled-input.hbs",
    "systems/animabf/templates/common/ui/vertical-titled-input.hbs",
    "systems/animabf/templates/common/ui/group.hbs",
    "systems/animabf/templates/common/ui/group-header.hbs",
    "systems/animabf/templates/common/ui/group-header-title.hbs",
    "systems/animabf/templates/common/ui/group-body.hbs",
    "systems/animabf/templates/common/ui/group-footer.hbs",
    "systems/animabf/templates/common/ui/add-item-button.hbs",
    "systems/animabf/templates/common/ui/custom-select.hbs",
    "systems/animabf/templates/common/ui/custom-select-choices.hbs",
    "systems/animabf/templates/common/ui/loading-indicator.hbs",
    // Domain parts
    "systems/animabf/templates/common/domain/weapon/one-or-two-handed.hbs",
    "systems/animabf/templates/common/domain/weapon/knowledge-type.hbs",
    "systems/animabf/templates/common/domain/weapon/select-ammo.hbs",
    "systems/animabf/templates/common/domain/armor/select-armor-type.hbs",
    "systems/animabf/templates/common/domain/armor/select-armor-localization.hbs",
    "systems/animabf/templates/common/domain/select-quality.hbs",
    // Items sheet parts
    "systems/animabf/templates/items/base/base-sheet.hbs",
    "systems/animabf/templates/items/base/parts/item-image.hbs",
    "systems/animabf/templates/items/weapon/weapon.hbs",
    "systems/animabf/templates/items/ammo/ammo.hbs",
    "systems/animabf/templates/items/armor/armor.hbs",
    "systems/animabf/templates/items/spell/spell.hbs",
    "systems/animabf/templates/items/psychicPower/psychicPower.hbs",
    // Actor sheet parts
    "systems/animabf/templates/actor/parts/header/header.hbs",
    "systems/animabf/templates/actor/parts/header/parts/top.hbs",
    "systems/animabf/templates/actor/parts/header/parts/actor-image.hbs",
    "systems/animabf/templates/actor/parts/header/parts/total-armor.hbs",
    "systems/animabf/templates/actor/parts/header/parts/common-resources.hbs",
    "systems/animabf/templates/actor/parts/header/parts/modifiers.hbs",
    "systems/animabf/templates/actor/parts/header/parts/primary-characteristics.hbs",
    "systems/animabf/templates/actor/parts/header/parts/resistances.hbs",
    "systems/animabf/templates/actor/parts/general/general.hbs",
    "systems/animabf/templates/actor/parts/general/parts/level.hbs",
    "systems/animabf/templates/actor/parts/general/parts/language.hbs",
    "systems/animabf/templates/actor/parts/general/parts/elan.hbs",
    "systems/animabf/templates/actor/parts/general/parts/titles.hbs",
    "systems/animabf/templates/actor/parts/general/parts/destiny-points.hbs",
    "systems/animabf/templates/actor/parts/general/parts/presence.hbs",
    "systems/animabf/templates/actor/parts/general/parts/experience.hbs",
    "systems/animabf/templates/actor/parts/general/parts/advantages.hbs",
    "systems/animabf/templates/actor/parts/general/parts/disadvantages.hbs",
    "systems/animabf/templates/actor/parts/general/parts/aspect.hbs",
    "systems/animabf/templates/actor/parts/general/parts/description.hbs",
    "systems/animabf/templates/actor/parts/general/parts/regeneration.hbs",
    "systems/animabf/templates/actor/parts/general/parts/contacts.hbs",
    "systems/animabf/templates/actor/parts/general/parts/notes.hbs",
    "systems/animabf/templates/actor/parts/general/parts/inventory-items.hbs",
    "systems/animabf/templates/actor/parts/general/parts/money.hbs",
    "systems/animabf/templates/actor/parts/secondaries/secondaries.hbs",
    "systems/animabf/templates/actor/parts/secondaries/common/secondary-skill.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/athletics.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/vigor.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/perception.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/intellectual.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/subterfuge.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/social.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/creative.hbs",
    "systems/animabf/templates/actor/parts/secondaries/parts/secondary-special-skills.hbs",
    "systems/animabf/templates/actor/parts/combat/combat.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/base-values.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/combat-special-skills.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/combat-tables.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/ammo.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/armors.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/weapons.hbs",
    "systems/animabf/templates/actor/parts/combat/parts/supernatural-shields.hbs",
    "systems/animabf/templates/actor/parts/mystic/mystic.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/act.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/magic-projection.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/zeon-regeneration.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/innate-magic.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/zeon.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/mystic-settings.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/summoning.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/spheres.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/spells/spells.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/spells/grade/grade.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/spell-maintenances.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/selected-spells.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/prepared-spells.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/summons.hbs",
    "systems/animabf/templates/actor/parts/mystic/parts/metamagics.hbs",
    "systems/animabf/templates/actor/parts/domine/domine.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/ki-skills.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/nemesis-skills.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/ars-magnus.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/martial-arts.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/creatures.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/special-skills-tables.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/ki-accumulation.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/martial-knowledge.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/seals.hbs",
    "systems/animabf/templates/actor/parts/domine/parts/techniques.hbs",
    "systems/animabf/templates/actor/parts/psychic/psychic.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/psychic-potential.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/psychic-projection.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/mental-patterns.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/innate-psychic-powers.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/psychic-points.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/psychic-settings.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/psychic-disciplines.hbs",
    "systems/animabf/templates/actor/parts/psychic/parts/psychic-powers.hbs",
    "systems/animabf/templates/actor/parts/settings/settings.hbs",
    "systems/animabf/templates/actor/parts/settings/parts/tabVisibility.hbs",
    "systems/animabf/templates/actor/parts/settings/parts/automationOptions.hbs",
    "systems/animabf/templates/actor/parts/settings/parts/advancedSettings.hbs",
    "systems/animabf/templates/actor/parts/settings/parts/advancedCharacteristics.hbs"
  ];
  return loadTemplates(templatePaths);
};
export {
  preloadTemplates
};
