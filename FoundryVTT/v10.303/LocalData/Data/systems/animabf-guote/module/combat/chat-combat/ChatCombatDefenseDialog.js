import { ABFSettingsKeys } from '../../../utils/registerSettings.js';
import ABFFoundryRoll from '../../rolls/ABFFoundryRoll.js';
import { getFormula } from '../../rolls/utils/getFormula.js';
import { NoneWeaponCritic, WeaponCritic } from '../../types/combat/WeaponItemConfig.js';
import { ABFSystemName } from '../../../animabf-guote.name.js';

const TEMPLATE_PATH = `systems/${ABFSystemName}/templates/dialog/combat/chat-combat-defense/chat-combat-defense-dialog.hbs`;

/**
 * Get initial data for the defense dialog
 * @param {ChatMessage} attackMessage - The attack chat message
 * @param {TokenDocument} defenderToken - The defending token
 */
const getInitialData = (attackMessage, defenderToken) => {
    const showRollByDefault = !!game.settings.get(
        'animabf-guote',
        ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT
    );
    const isGM = !!game.user?.isGM;
    const defenderActor = defenderToken.actor;
    const attackFlags = attackMessage.flags['animabf-guote'].chatCombat;

    const activeTab = defenderActor.system.general.settings.defenseType.value === 'resistance'
        ? 'damageResistance'
        : 'combat';

    return {
        ui: {
            isGM,
            hasFatiguePoints: defenderActor.system.characteristics.secondaries.fatigue.value > 0,
            activeTab
        },
        attacker: {
            name: attackFlags.attackerInfo.name,
            img: attackFlags.attackerInfo.img,
            attackType: attackFlags.attackType,
            critic: attackFlags.damageType,
            attackTotal: attackFlags.attackTotal
        },
        defender: {
            token: defenderToken,
            actor: defenderActor,
            showRoll: !isGM || showRollByDefault,
            withoutRoll: defenderActor.system.general.settings.defenseType.value === 'mass',
            combat: {
                fatigue: 0,
                multipleDefensesPenalty: 0,
                modifier: 0,
                weaponUsed: undefined,
                weapon: undefined,
                unarmed: false,
                at: {
                    special: 0,
                    final: 0
                }
            },
            mystic: {
                modifier: 0,
                magicProjectionType: 'defensive',
                spellUsed: undefined,
                spellGrade: 'base'
            },
            psychic: {
                modifier: 0,
                psychicPotential: {
                    special: 0,
                    final: defenderActor.system.psychic.psychicPotential.final.value
                },
                psychicProjection: defenderActor.system.psychic.psychicProjection.imbalance.defensive.final.value,
                powerUsed: undefined
            }
        },
        defenseSent: false
    };
};

/**
 * Defense dialog for the chat-based combat system.
 * Supports combat (dodge/block), mystic, and psychic defenses.
 */
export class ChatCombatDefenseDialog extends FormApplication {
    constructor(attackMessage, defenderToken, hooks) {
        super(getInitialData(attackMessage, defenderToken));
        this.attackMessage = attackMessage;
        this.attackFlags = attackMessage.flags['animabf-guote'].chatCombat;
        this.defenderToken = defenderToken;
        this.modalData = getInitialData(attackMessage, defenderToken);
        this.hooks = hooks;

        // Set up tab callback
        this._tabs[0].callback = (event, tabs, tabName) => {
            this.modalData.ui.activeTab = tabName;
            this.render(true);
        };

        // Initialize weapon
        const { weapons } = this.defenderActor.system.combat;
        if (weapons.length > 0) {
            this.modalData.defender.combat.weaponUsed = weapons[0]._id;
        } else {
            this.modalData.defender.combat.unarmed = true;
        }

        this.render(true);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['abf-dialog', 'chat-combat-defense-dialog'],
            submitOnChange: true,
            closeOnSubmit: false,
            width: 525,
            height: 'auto',
            resizable: true,
            template: TEMPLATE_PATH,
            title: game.i18n.localize('chat.combat.defense.dialogTitle'),
            tabs: [{
                navSelector: '.sheet-tabs',
                contentSelector: '.sheet-body',
                initial: 'combat'
            }]
        });
    }

    get defenderActor() {
        return this.defenderToken.actor;
    }

    /**
     * Get all armor values for the defender
     */
    getArmorValues() {
        const armor = this.defenderActor.system.combat.totalArmor.at;
        return {
            cut: armor.cut.value,
            impact: armor.impact.value,
            thrust: armor.thrust.value,
            heat: armor.heat.value,
            electricity: armor.electricity.value,
            cold: armor.cold.value,
            energy: armor.energy.value
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Physical defense (dodge/block)
        html.find('.send-defense').click((e) => {
            e.preventDefault();
            const type = e.currentTarget.dataset.type === 'dodge' ? 'dodge' : 'block';
            this._sendCombatDefense(type);
        });

        // Mystic defense
        html.find('.send-mystic-defense').click((e) => {
            e.preventDefault();
            this._sendMysticDefense();
        });

        // Psychic defense
        html.find('.send-psychic-defense').click((e) => {
            e.preventDefault();
            this._sendPsychicDefense();
        });

        // Cancel button
        html.find('.cancel-button').click((e) => {
            e.preventDefault();
            this.close({ force: true });
        });
    }

    /**
     * Send physical combat defense (dodge or block)
     */
    async _sendCombatDefense(type) {
        const { fatigue, modifier, weapon, multipleDefensesPenalty, at } = this.modalData.defender.combat;

        let value;
        let baseDefense;

        if (type === 'dodge') {
            value = this.defenderActor.system.combat.dodge.final.value;
            baseDefense = this.defenderActor.system.combat.dodge.base.value;
        } else {
            value = weapon
                ? weapon.system.block.final.value
                : this.defenderActor.system.combat.block.final.value;
            baseDefense = this.defenderActor.system.combat.block.base.value;
        }

        const rollModifiers = [value, fatigue * 15, modifier, multipleDefensesPenalty];
        const rollLabels = ['HD', 'Cansancio', 'Mod', 'Def. múlt'];
        let formula = getFormula({ values: rollModifiers, labels: rollLabels });

        if (this.modalData.defender.withoutRoll) {
            formula = formula.replace('1d100xa', '0');
        }
        if (baseDefense >= 200) {
            formula = formula.replace('xa', 'xamastery');
        }

        const roll = new ABFFoundryRoll(formula, this.defenderActor.system);
        await roll.roll();

        if (this.modalData.defender.showRoll) {
            const flavor = game.i18n.format(`macros.combat.dialog.physicalDefense.${type}.title`, {
                target: this.attackFlags.attackerInfo.name
            });
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ token: this.defenderToken }),
                flavor
            });
        }

        const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);

        this.hooks.onDefense({
            type: 'combat',
            defenseType: type,
            total: roll.total,
            roll: rolled,
            fatigue,
            modifier,
            multipleDefensesPenalty,
            at: at.final,
            armorValues: this.getArmorValues()
        });

        this.modalData.defenseSent = true;
        this.render();

        setTimeout(() => this.close({ force: true }), 500);
    }

    /**
     * Send mystic defense
     */
    async _sendMysticDefense() {
        const { modifier, spellUsed, spellGrade } = this.modalData.defender.mystic;
        const { at } = this.modalData.defender.combat;

        if (!spellUsed) {
            ui.notifications.warn(game.i18n.localize('chat.combat.defense.selectSpell'));
            return;
        }

        const magicProjection = this.defenderActor.system.mystic.magicProjection.imbalance.defensive.final.value;
        const baseMagicProjection = this.defenderActor.system.mystic.magicProjection.imbalance.defensive.base.value;

        let formula = `1d100xa + ${magicProjection}[Proy. Mag.] + ${modifier ?? 0}[Mod.]`;

        if (this.modalData.defender.withoutRoll) {
            formula = formula.replace('1d100xa', '0');
        }
        if (baseMagicProjection >= 200) {
            formula = formula.replace('xa', 'xamastery');
        }

        const roll = new ABFFoundryRoll(formula, this.defenderActor.system);
        await roll.roll();

        if (this.modalData.defender.showRoll) {
            const { spells } = this.defenderActor.system.mystic;
            const spell = spells.find(w => w._id === spellUsed);
            const flavor = game.i18n.format('macros.combat.dialog.magicDefense.title', {
                spell: spell?.name || 'Unknown',
                target: this.attackFlags.attackerInfo.name
            });
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ token: this.defenderToken }),
                flavor
            });
        }

        const rolled = roll.total - magicProjection - (modifier ?? 0);

        this.hooks.onDefense({
            type: 'mystic',
            total: roll.total,
            roll: rolled,
            modifier,
            magicProjection,
            spellUsed,
            spellGrade,
            at: at.final,
            armorValues: this.getArmorValues()
        });

        this.modalData.defenseSent = true;
        this.render();

        setTimeout(() => this.close({ force: true }), 500);
    }

    /**
     * Send psychic defense
     */
    async _sendPsychicDefense() {
        const { psychicProjection, psychicPotential, powerUsed, modifier } = this.modalData.defender.psychic;
        const { at } = this.modalData.defender.combat;

        if (!powerUsed) {
            ui.notifications.warn(game.i18n.localize('chat.combat.defense.selectPower'));
            return;
        }

        let formula = `1d100xa + ${psychicProjection}[Proy. Psíquica] + ${modifier ?? 0}[Mod.]`;

        if (this.modalData.defender.withoutRoll) {
            formula = formula.replace('1d100xa', '0');
        }
        if (this.defenderActor.system.psychic.psychicProjection.base.value >= 200) {
            formula = formula.replace('xa', 'xamastery');
        }

        const roll = new ABFFoundryRoll(formula, this.defenderActor.system);
        await roll.roll();

        const powers = this.defenderActor.system.psychic.psychicPowers;
        const power = powers.find(w => w._id === powerUsed);

        if (this.modalData.defender.showRoll) {
            const flavor = game.i18n.format('macros.combat.dialog.psychicDefense.title', {
                power: power?.name || 'Unknown',
                target: this.attackFlags.attackerInfo.name
            });
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ token: this.defenderToken }),
                flavor
            });
        }

        const rolled = roll.total - psychicProjection - (modifier ?? 0);

        this.hooks.onDefense({
            type: 'psychic',
            total: roll.total,
            roll: rolled,
            modifier,
            powerUsed,
            psychicProjection,
            psychicPotential: psychicPotential.final + (power?.system.bonus.value ?? 0),
            at: at.final,
            armorValues: this.getArmorValues()
        });

        this.modalData.defenseSent = true;
        this.render();

        setTimeout(() => this.close({ force: true }), 500);
    }

    getData() {
        // Update fatigue availability
        this.modalData.ui.hasFatiguePoints =
            this.defenderActor.system.characteristics.secondaries.fatigue.value > 0;

        // Update psychic potential
        this.modalData.defender.psychic.psychicPotential.final =
            this.modalData.defender.psychic.psychicPotential.special +
            this.defenderActor.system.psychic.psychicPotential.final.value;

        // Calculate AT based on attacker's critic type
        let at;
        const critic = this.attackFlags.damageType;
        if (critic && critic !== NoneWeaponCritic.NONE) {
            const armor = this.defenderActor.system.combat.totalArmor.at;
            switch (critic) {
                case WeaponCritic.CUT:
                case 'cut':
                    at = armor.cut.value;
                    break;
                case WeaponCritic.IMPACT:
                case 'impact':
                    at = armor.impact.value;
                    break;
                case WeaponCritic.THRUST:
                case 'thrust':
                    at = armor.thrust.value;
                    break;
                case WeaponCritic.HEAT:
                case 'heat':
                    at = armor.heat.value;
                    break;
                case WeaponCritic.ELECTRICITY:
                case 'electricity':
                    at = armor.electricity.value;
                    break;
                case WeaponCritic.COLD:
                case 'cold':
                    at = armor.cold.value;
                    break;
                case WeaponCritic.ENERGY:
                case 'energy':
                    at = armor.energy.value;
                    break;
                default:
                    at = 0;
            }
        }

        if (at !== undefined) {
            this.modalData.defender.combat.at.final =
                this.modalData.defender.combat.at.special + at;
        }

        // Update weapon reference
        const { combat } = this.modalData.defender;
        const { weapons } = this.defenderActor.system.combat;
        combat.weapon = weapons.find(w => w._id === combat.weaponUsed);

        return this.modalData;
    }

    async _updateObject(event, formData) {
        this.modalData = mergeObject(this.modalData, formData);
        this.render();
    }
}
