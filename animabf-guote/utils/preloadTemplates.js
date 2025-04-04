import { ABFSystemName } from '../animabf-guote.name.js';
import { Templates } from '../module/utils/constants.js';
export const preloadTemplates = () => {
    const templatePaths = [
        Templates.Dialog.ModDialog,
        Templates.Dialog.DamageCalculator,
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
        // TODO Add paths to "systems/AnimaBeyondFoundry/templates"
        // Common parts
        `systems/${ABFSystemName}/templates/common/ui/horizontal-titled-input.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/vertical-titled-input.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/group.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/group-header.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/group-header-title.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/group-body.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/group-footer.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/add-item-button.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/custom-select.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/custom-select-choices.hbs`,
        `systems/${ABFSystemName}/templates/common/ui/loading-indicator.hbs`,
        // Domain parts
        `systems/${ABFSystemName}/templates/common/domain/weapon/one-or-two-handed.hbs`,
        `systems/${ABFSystemName}/templates/common/domain/weapon/knowledge-type.hbs`,
        `systems/${ABFSystemName}/templates/common/domain/weapon/select-ammo.hbs`,
        `systems/${ABFSystemName}/templates/common/domain/armor/select-armor-type.hbs`,
        `systems/${ABFSystemName}/templates/common/domain/armor/select-armor-localization.hbs`,
        `systems/${ABFSystemName}/templates/common/domain/select-quality.hbs`,
        // Items sheet parts
        `systems/${ABFSystemName}/templates/items/base/base-sheet.hbs`,
        `systems/${ABFSystemName}/templates/items/base/parts/item-image.hbs`,
        `systems/${ABFSystemName}/templates/items/weapon/weapon.hbs`,
        `systems/${ABFSystemName}/templates/items/ammo/ammo.hbs`,
        `systems/${ABFSystemName}/templates/items/armor/armor.hbs`,
        `systems/${ABFSystemName}/templates/items/spell/spell.hbs`,
        `systems/${ABFSystemName}/templates/items/psychicPower/psychicPower.hbs`,
        `systems/${ABFSystemName}/templates/items/inventoryItem/inventoryItem.hbs`,
        // Actor sheet parts
        `systems/${ABFSystemName}/templates/actor/parts/header/header.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/top.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/actor-image.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/total-armor.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/common-resources.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/modifiers.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/primary-characteristics.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/header/parts/resistances.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/general.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/level.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/language.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/elan.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/titles.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/destiny-points.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/presence.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/experience.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/advantages.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/disadvantages.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/aspect.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/description.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/regeneration.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/contacts.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/notes.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/inventory-items.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/general/parts/money.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/secondaries.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/common/secondary-skill.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/athletics.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/vigor.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/perception.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/intellectual.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/subterfuge.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/social.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/creative.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/secondaries/parts/secondary-special-skills.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/combat.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/parts/base-values.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/parts/combat-special-skills.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/parts/combat-tables.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/parts/ammo.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/parts/armors.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/combat/parts/weapons.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/mystic.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/act.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/magic-projection.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/zeon-regeneration.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/innate-magic.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/zeon.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/summoning.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/spheres.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/spells/spells.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/spells/grade/grade.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/spell-maintenances.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/selected-spells.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/summons.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/mystic/parts/metamagics.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/domine.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/ki-skills.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/nemesis-skills.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/ars-magnus.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/martial-arts.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/creatures.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/special-skills-tables.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/ki-accumulation.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/martial-knowledge.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/seals.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/domine/parts/techniques.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/psychic.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/psychic-potential.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/psychic-projection.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/mental-patterns.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/innate-psychic-powers.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/psychic-points.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/psychic-disciplines.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/psychic/parts/psychic-powers.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/settings/settings.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/settings/parts/tabVisibility.hbs`,
        `systems/${ABFSystemName}/templates/actor/parts/settings/parts/advancedSettings.hbs`
    ];
    return loadTemplates(templatePaths);
};
