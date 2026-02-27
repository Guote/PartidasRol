import { ABFSettingsKeys } from '../../../utils/registerSettings.js';
import ABFFoundryRoll from '../../rolls/ABFFoundryRoll.js';
import { getFormula } from '../../rolls/utils/getFormula.js';
import { getModifierTerms } from '../../rolls/utils/getModifierTerms.js';
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
                powerUsed: undefined,
                potentialResult: null
            },
            resistance: {
                surprised: false
            },
            summon: {
                modifier: 0,
                summonUsed: undefined,
                summon: undefined,
                effectiveHD: 0
            }
        },
        defenseSent: false,
        presetName: '',
        selectedPresetId: ''
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

        // Set initial tab based on defense type
        const initialTab = this.modalData.ui.activeTab || 'combat';
        this._tabs[0].active = initialTab;

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
            title: game.i18n.localize('anima.chat.combat.defense.dialogTitle'),
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

        // Roll Only Psychic Potential button (defense)
        html.find('.roll-psychic-potential-defense').click(async (e) => {
            e.preventDefault();
            const { psychicPotential, powerUsed } = this.modalData.defender.psychic;
            if (!powerUsed) {
                ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectPower'));
                return;
            }
            const powers = this.defenderActor.system.psychic.psychicPowers;
            const power = powers.find(w => w._id === powerUsed);
            if (!power) return;

            const formula = getFormula({
                values: [psychicPotential.final, power.system.bonus.value],
                labels: ['Potencial', 'Bono Poder'],
            });

            const roll = new ABFFoundryRoll(formula, this.defenderActor.system);
            await roll.roll();

            if (this.modalData.defender.showRoll) {
                roll.toMessage({
                    speaker: ChatMessage.getSpeaker({ token: this.defenderToken }),
                    flavor: game.i18n.format('anima.macros.combat.dialog.psychicPotential.title'),
                });
            }

            this.modalData.defender.psychic.potentialResult = {
                total: roll.total,
            };

            // Re-render (does NOT close)
            this.render();
        });

        // Summon defense
        html.find('.send-summon-defense').click((e) => {
            e.preventDefault();
            this._sendSummonDefense();
        });

        // Damage resistance defense
        html.find('.send-defense-damage-resistance').click((e) => {
            e.preventDefault();
            this._sendDamageResistanceDefense();
        });

        // Preset name input handler - track value and update button disabled state
        const presetInput = html.find('.preset-name-input');
        const saveButton = html.find('.save-defense-preset');

        // Update button disabled state based on input value
        const updateSaveButtonState = () => {
            const hasValue = presetInput.val()?.trim().length > 0;
            saveButton.prop('disabled', !hasValue);
        };

        // Listen for input changes
        presetInput.on('input keyup', (e) => {
            // Save value to modalData so it survives re-renders
            this.modalData.presetName = e.target.value;
            updateSaveButtonState();
        });

        // Initial state check
        updateSaveButtonState();

        // Load preset selector handler
        html.find('.load-defense-preset').change((e) => {
            const presetId = e.target.value;
            if (!presetId) {
                // "New defense" selected - reset to defaults
                this.modalData.selectedPresetId = '';
                return;
            }

            // Find the preset and load its data
            const preset = this.defenderActor.system.combat.defensePresets.find(p => p._id === presetId);
            if (!preset) return;

            this.modalData.selectedPresetId = presetId;
            this._loadPresetData(preset.system);
        });

        // Save defense preset handler
        saveButton.click(async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const name = this.modalData.presetName?.trim();
            if (!name) return; // Button should be disabled, but double-check

            // Get the current active tab as the defense type
            const defenseType = this._tabs[0].active || 'combat';

            await this._saveAsPreset(defenseType, name);

            // Clear input and update state
            this.modalData.presetName = '';
            presetInput.val('');
            updateSaveButtonState();
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

        const { values: modTermValues, labels: modTermLabels } = getModifierTerms(this.defenderActor.system, "defense");
        const rollModifiers = [value, fatigue * 15, multipleDefensesPenalty, ...modTermValues, modifier];
        const rollLabels = ['HD', 'Cansancio', 'Def. múlt', ...modTermLabels, 'Mod'];
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
            const flavor = game.i18n.format(`anima.macros.combat.dialog.physicalDefense.${type}.title`, {
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
            ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectSpell'));
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
            const flavor = game.i18n.format('anima.macros.combat.dialog.magicDefense.title', {
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
     * Send damage resistance defense (no active defense, just take damage)
     */
    async _sendDamageResistanceDefense() {
        const { at } = this.modalData.defender.combat;
        const { surprised } = this.modalData.defender.resistance;

        this.hooks.onDefense({
            type: 'resistance',
            total: 0,
            surprised,
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
            ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectPower'));
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
            const flavor = game.i18n.format('anima.macros.combat.dialog.psychicDefense.title', {
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

    /**
     * Send summon defense
     */
    async _sendSummonDefense() {
        const { summonUsed, modifier } = this.modalData.defender.summon;
        const { at } = this.modalData.defender.combat;

        if (!summonUsed) {
            ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectSummon'));
            return;
        }

        const summons = this.defenderActor.system.mystic.summons;
        const summon = summons.find(s => s._id === summonUsed);
        if (!summon) return;

        const effectiveHD = (summon.system.baseDef.value || 0) + (summon.system.bonusDef.value || 0);

        let formula = `1d100xa + ${effectiveHD}[HD Invocación] + ${modifier ?? 0}[Mod.]`;

        if (this.modalData.defender.withoutRoll) {
            formula = formula.replace('1d100xa', '0');
        }

        const roll = new ABFFoundryRoll(formula, this.defenderActor.system);
        await roll.roll();

        if (this.modalData.defender.showRoll) {
            const flavor = game.i18n.format('anima.macros.combat.dialog.summonDefense.title', {
                summon: summon.name,
                target: this.attackFlags.attackerInfo.name
            });
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ token: this.defenderToken }),
                flavor
            });
        }

        const rolled = roll.total - effectiveHD - (modifier ?? 0);

        this.hooks.onDefense({
            type: 'summon',
            total: roll.total,
            roll: rolled,
            modifier,
            summonUsed,
            effectiveHD,
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

        // Update summon reference
        const { summon: summonData } = this.modalData.defender;
        const { summons } = this.defenderActor.system.mystic;
        if (summonData.summonUsed) {
            const selectedSummon = summons.find(s => s._id === summonData.summonUsed);
            if (selectedSummon) {
                summonData.summon = selectedSummon;
                summonData.effectiveHD = (selectedSummon.system.baseDef.value || 0) + (selectedSummon.system.bonusDef.value || 0);
            }
        } else if (summons.length > 0) {
            summonData.summonUsed = summons[0]._id;
            summonData.summon = summons[0];
            summonData.effectiveHD = (summons[0].system.baseDef.value || 0) + (summons[0].system.bonusDef.value || 0);
        }

        return this.modalData;
    }

    async _updateObject(event, formData) {
        // Skip merge if we're loading a preset (to prevent form data from overwriting preset values)
        if (this._loadingPreset) {
            this._loadingPreset = false;
            return;
        }

        this.modalData = mergeObject(this.modalData, formData);
        this.render();
    }

    /**
     * Save current defense configuration as a preset
     * @param {string} defenseType - The type of defense ('combat', 'mystic', or 'psychic')
     * @param {string} name - The preset name
     */
    async _saveAsPreset(defenseType = 'combat', name) {
        const { i18n } = game;
        const { combat, mystic, psychic, summon: summonData, withoutRoll, showRoll } = this.modalData.defender;

        const presetData = {
            defenseType: { value: defenseType },
            withoutRoll: { value: withoutRoll || false },
            showRoll: { value: showRoll ?? true },
            combat: {
                modifier: { value: combat.modifier || 0 },
                fatigue: { value: combat.fatigue || 0 },
                weaponUsed: { value: combat.weaponUsed || '' },
                method: { value: 'dodge' },
                atBonus: { value: combat.at?.special || 0 },
            },
            mystic: {
                modifier: { value: mystic.modifier || 0 },
                projectionType: { value: mystic.magicProjectionType || 'defensive' },
                spellUsed: { value: mystic.spellUsed || '' },
                spellGrade: { value: mystic.spellGrade || 'base' },
            },
            psychic: {
                modifier: { value: psychic.modifier || 0 },
                potentialBonus: { value: psychic.psychicPotential?.special || 0 },
                powerUsed: { value: psychic.powerUsed || '' },
            },
            summon: {
                modifier: { value: summonData?.modifier || 0 },
                summonUsed: { value: summonData?.summonUsed || '' },
            },
        };

        await this.defenderActor.createEmbeddedDocuments('Item', [{
            name,
            type: 'defensePreset',
            system: presetData,
        }]);

        ui.notifications.info(i18n.format('anima.notifications.presetSaved', { name }));
    }

    /**
     * Load preset data into the dialog
     * @param {Object} presetData - The preset system data to load
     */
    _loadPresetData(presetData) {
        const { defender } = this.modalData;

        // Load common settings - ensure boolean conversion
        defender.withoutRoll = Boolean(presetData.withoutRoll?.value);
        defender.showRoll = presetData.showRoll?.value !== false; // Default true

        // Load combat data
        if (presetData.combat) {
            defender.combat.modifier = Number(presetData.combat.modifier?.value) || 0;
            defender.combat.fatigue = Number(presetData.combat.fatigue?.value) || 0;
            defender.combat.weaponUsed = presetData.combat.weaponUsed?.value || defender.combat.weaponUsed;
            if (presetData.combat.atBonus?.value) {
                defender.combat.at = defender.combat.at || {};
                defender.combat.at.special = Number(presetData.combat.atBonus.value) || 0;
            }
        }

        // Load mystic data
        if (presetData.mystic) {
            defender.mystic.modifier = Number(presetData.mystic.modifier?.value) || 0;
            defender.mystic.magicProjectionType = presetData.mystic.projectionType?.value || 'defensive';
            defender.mystic.spellUsed = presetData.mystic.spellUsed?.value || defender.mystic.spellUsed;
            defender.mystic.spellGrade = presetData.mystic.spellGrade?.value || 'base';
        }

        // Load psychic data
        if (presetData.psychic) {
            defender.psychic.modifier = Number(presetData.psychic.modifier?.value) || 0;
            if (presetData.psychic.potentialBonus?.value) {
                defender.psychic.psychicPotential = defender.psychic.psychicPotential || {};
                defender.psychic.psychicPotential.special = Number(presetData.psychic.potentialBonus.value) || 0;
            }
            defender.psychic.powerUsed = presetData.psychic.powerUsed?.value || defender.psychic.powerUsed;
        }

        // Load summon data
        if (presetData.summon) {
            defender.summon.modifier = Number(presetData.summon.modifier?.value) || 0;
            defender.summon.summonUsed = presetData.summon.summonUsed?.value || defender.summon.summonUsed;
        }

        // Switch to the preset's defense type tab
        const defenseType = presetData.defenseType?.value ?? 'combat';
        this._tabs[0].active = defenseType;
        this.modalData.ui.activeTab = defenseType;

        // Set flag to prevent _updateObject from overwriting our changes
        this._loadingPreset = true;

        // Force full re-render to show loaded data
        this.render(true);
    }
}
