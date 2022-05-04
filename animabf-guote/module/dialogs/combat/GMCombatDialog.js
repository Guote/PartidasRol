import { Templates } from "../../utils/constants.js";
import { calculateCombatResult } from "../../combat/utils/calculateCombatResult.js";
import { calculateATReductionByQuality } from "../../combat/utils/calculateATReductionByQuality.js";
const getInitialData = (attacker, defender, options = {}) => {
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;
    return {
        ui: {
            isCounter: options.isCounter ?? false
        },
        attacker: {
            token: attacker,
            actor: attackerActor,
            customModifier: 0,
            counterAttackBonus: options.counterAttackBonus,
            isReady: false
        },
        defender: {
            token: defender,
            actor: defenderActor,
            customModifier: 0,
            isReady: false
        }
    };
};
export class GMCombatDialog extends FormApplication {
    constructor(attacker, defender, hooks, options = {}) {
        super(getInitialData(attacker, defender, options));
        this.hooks = hooks;
        this.data = getInitialData(attacker, defender, options);
        this.render(true);
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['abf-dialog gm-combat-dialog'],
            submitOnChange: true,
            closeOnSubmit: false,
            height: 600,
            width: 700,
            template: 'systems/animabf-guote/templates/dialog/combat/gm-combat-dialog.hbs',
            title: 'GM Combat'
        });
    }
    get attackerActor() {
        return this.data.attacker.token.actor;
    }
    get defenderActor() {
        return this.data.defender.token.actor;
    }
    get attackerToken() {
        return this.data.attacker.token;
    }
    get defenderToken() {
        return this.data.defender.token;
    }
    async close(options = { executeHook: true }) {
        if (options?.executeHook) {
            await this.hooks.onClose();
        }
        return super.close();
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.cancel-button').click(() => {
            this.close();
        });
        html.find('.make-counter').click(() => {
            this.applyValuesIfBeAble();
            if (this.data.calculations?.canCounter) {
                this.hooks.onCounterAttack(this.data.calculations.counterAttackBonus);
            }
        });
        html.find('.apply-values').click(() => {
            this.applyValuesIfBeAble();
            if (!this.data.calculations?.canCounter && this.canApplyDamage) {
                this.defenderActor.applyDamage(this.data.calculations.damage);
            }
            this.close();
        });
        html.find('.show-results').click(async () => {
            const data = {
                attacker: this.attackerActor,
                defender: this.defenderActor,
                result: this.data.calculations?.difference,
                canCounter: this.data.calculations?.canCounter
            };
            if (this.data.calculations?.canCounter) {
                data.bonus = this.data.calculations.counterAttackBonus;
            }
            else {
                data.damage = this.data.calculations?.damage;
            }
            await renderTemplate(Templates.Chat.CombatResult, data).then(content => {
                ChatMessage.create({
                    content
                });
            });
        });
    }
    get canApplyDamage() {
        return (this.data.attacker.result?.type === 'combat' &&
            this.data.defender.result?.type === 'combat' &&
            this.data.calculations &&
            this.data.calculations.difference > 0 &&
            !this.data.calculations.canCounter &&
            this.data.calculations.damage !== undefined &&
            this.data.calculations?.damage > 0);
    }
    applyValuesIfBeAble() {
        if (this.data.attacker.result?.type === 'combat') {
            this.attackerActor.applyFatigue(this.data.attacker.result.values.fatigueUsed);
        }
        if (this.data.defender.result?.type === 'combat') {
            this.defenderActor.applyFatigue(this.data.defender.result.values.fatigue);
        }
    }
    updateAttackerData(result) {
        this.data.attacker.result = result;
        if (result.type === 'combat') {
            const weapons = this.attackerActor.data.data.combat.weapons;
            this.data.attacker.result.weapon = weapons.find(w => w._id === result.values.weaponUsed);
        }
        if (result.type === 'mystic') {
            const spells = this.attackerActor.data.data.mystic.spells;
            this.data.attacker.result.spell = spells.find(w => w._id === result.values.spellUsed);
        }
        if (result.type === 'psychic') {
            const powers = this.attackerActor.data.data.psychic.psychicPowers;
            this.data.attacker.result.power = powers.find(w => w._id === result.values.powerUsed);
        }
        this.render();
    }
    updateDefenderData(result) {
        result.values.total = Math.max(0, result.values.total);
        this.data.defender.result = result;
        if (result.type === 'mystic') {
            const spells = this.defenderActor.data.data.mystic.spells;
            this.data.defender.result.spell = spells.find(w => w._id === result.values.spellUsed);
        }
        if (result.type === 'psychic') {
            const powers = this.defenderActor.data.data.psychic.psychicPowers;
            this.data.defender.result.power = powers.find(w => w._id === result.values.powerUsed);
        }
        this.render();
    }
    getData() {
        const { attacker, defender } = this.data;
        attacker.isReady = !!attacker.result;
        defender.isReady = !!defender.result;
        if (attacker.result && defender.result) {
            const attackerTotal = Math.max(attacker.result.values.total + this.data.attacker.customModifier, 0);
            const defenderTotal = Math.max(defender.result.values.total + this.data.defender.customModifier, 0);
            const winner = attackerTotal > defenderTotal ? attacker.token : defender.token;
            if (attacker.result.type === 'combat' && defender.result.type === 'combat') {
                const combatResult = calculateCombatResult(Math.max(attackerTotal, 0), Math.max(defenderTotal, 0), Math.max(defender.result.values.at - calculateATReductionByQuality(attacker.result.weapon?.data.quality.value ?? 0), 0), attacker.result.values.damage);
                if (combatResult.canCounterAttack) {
                    this.data.calculations = {
                        difference: attackerTotal - defenderTotal,
                        canCounter: true,
                        winner,
                        counterAttackBonus: combatResult.counterAttackBonus
                    };
                }
                else {
                    this.data.calculations = {
                        difference: attackerTotal - defenderTotal,
                        canCounter: false,
                        winner,
                        damage: combatResult.damage
                    };
                }
            }
            else {
                this.data.calculations = {
                    difference: attackerTotal - defenderTotal,
                    canCounter: false,
                    winner
                };
            }
        }
        return this.data;
    }
    async _updateObject(event, formData) {
        this.data = mergeObject(this.data, formData);
        this.render();
    }
}
