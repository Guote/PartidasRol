import { ABFItems } from './ABFItems.js';
import { ITEM_CONFIGURATIONS } from '../actor/utils/prepareItems/constants.js';
import { ABFSystemName } from '../../animabf-guote.name.js';
import { INITIAL_POWER_DATA } from '../types/mystic/SummonItemConfig.js';
export default class ABFItemSheet extends ItemSheet {
    constructor(object, options) {
        super(object, options);
        this.position.width = this.getWidthFromType();
        this.position.height = this.getHeightFromType();
    }
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['sheet', 'item'],
            resizable: true
        });
    }
    get template() {
        const configuration = ITEM_CONFIGURATIONS[this.item.type];
        if (configuration && configuration.hasSheet) {
            const path = `systems/${ABFSystemName}/templates/items/`;
            return `${path}/${this.item.type}/${this.item.type}.hbs`;
        }
        return super.template;
    }
    getWidthFromType() {
        switch (this.item.type) {
            case ABFItems.SPELL:
                return 700;
            case ABFItems.ARMOR:
                return 1000;
            case ABFItems.WEAPON:
                return 440;
            case ABFItems.SUMMON:
                return 500;
            case ABFItems.INCARNATION:
                return 600;
            default:
                return 900;
        }
    }
    getHeightFromType() {
        switch (this.item.type) {
            case ABFItems.SPELL:
                return 450;
            case ABFItems.WEAPON:
                return 520;
            case ABFItems.ARMOR:
                return 235;
            case ABFItems.AMMO:
                return 144;
            case ABFItems.PSYCHIC_POWER:
                return 500;
            case ABFItems.SUMMON:
                return 480;
            case ABFItems.INCARNATION:
                return 700;
            default:
                return 450;
        }
    }
    async getData(options) {
        const sheet = await super.getData(options);
        await sheet.item.prepareDerivedData();
        sheet.system = sheet.item.system;
        sheet.config = CONFIG.config;

        if (sheet.item.type === 'summon') {
            const specialization = sheet.item.actor?.system?.mystic?.summoning?.specialization?.value ?? 'ninguna';
            const evalF = (formula, ne) => {
                if (!formula?.trim()) return 0;
                try { return Roll.safeEval(formula.replace(/\[NE\]/gi, ne)); } catch { return '?'; }
            };
            const powers = sheet.system.powers ?? [];
            sheet.powersComputed = powers.map(power => {
                const ne = power.ne?.value ?? 0;
                const base = power.zeon?.base?.value ?? 0;
                return {
                    ...power,
                    atkFinal:    evalF(power.atkFormula?.value, ne),
                    defFinal:    evalF(power.defFormula?.value, ne),
                    damageFinal: evalF(power.damageFormula?.value, ne),
                    rmFinal:     evalF(power.rmFormula?.value, ne),
                    zeonFinal:   specialization === 'invocador' ? Math.ceil(base / 2) : base,
                };
            });
            sheet.multiPower = powers.length > 1;
        }

        if (sheet.item.type === 'weapon') {
            sheet.system.enrichedDescription = await TextEditor.enrichHTML(
                sheet.system.description?.value ?? '',
                { async: true }
            );
            sheet.computed = {
                attackFinal: (sheet.system.attack?.special?.value ?? 0) + (sheet.system.quality?.value ?? 0),
                blockFinal:  (sheet.system.block?.special?.value  ?? 0) + (sheet.system.quality?.value ?? 0),
                damageFinal: (sheet.system.damage?.base?.value    ?? 0) + (sheet.system.quality?.value ?? 0) * 2,
            };
        }

        return sheet;
    }
    async _updateObject(event, formData) {
        if (this.item.type === 'weapon') {
            if ('system.quality.value' in formData) {
                formData['system.quality.value'] = parseInt(formData['system.quality.value']) || 0;
            }
            return super._updateObject(event, formData);
        }
        if (this.item.type !== 'summon') return super._updateObject(event, formData);

        // Reconstruct the powers array from dot-notation form keys
        const powers = foundry.utils.deepClone(this.item.system.powers ?? []);
        const powerKeys = Object.keys(formData).filter(k => k.startsWith('system.powers.'));
        for (const key of powerKeys) {
            const parts = key.split('.');
            // parts: ['system','powers', idx, ...rest]
            const idx = parseInt(parts[2]);
            const rest = parts.slice(3).join('.');
            if (isNaN(idx) || !powers[idx]) continue;
            foundry.utils.setProperty(powers[idx], rest, formData[key]);
            delete formData[key];
        }
        formData['system.powers'] = powers;
        return super._updateObject(event, formData);
    }
    async _render(force, options) {
        // Capture weapon description open state before re-render
        if (this.item.type === 'weapon' && this.element?.length) {
            const el = this.element.find('.ws-description-accordion')[0];
            if (el) this._descriptionOpen = el.open;
        }
        // Capture which power accordions are open before re-render
        if (this.item.type === 'summon' && this.element?.length) {
            const states = {};
            this.element.find('.ss-power-accordion').each(function() {
                states[parseInt(this.dataset.powerIndex)] = this.open;
            });
            if (Object.keys(states).length > 0) this._accordionStates = states;
        }
        return super._render(force, options);
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (this.item.type === 'weapon') {
            const $desc = html.find('.ws-description-accordion');
            if (this._descriptionOpen !== undefined) {
                $desc[0].open = this._descriptionOpen;
            }
            $desc.on('toggle', () => { this._descriptionOpen = $desc[0].open; });
        }

        if (this.item.type !== 'summon') return;

        // Style window header to match the red theme
        const $app = html.closest('.app');
        $app.find('.window-header').css({
            background: 'linear-gradient(to bottom, #6e2917, #4a1b10)',
            color: '#fff',
            fontWeight: 'bold'
        });
        $app.find('.window-header a, .window-header button').css('color', 'rgba(255,255,255,0.8)');

        const evalFormula = (formula, ne) => {
            if (!formula?.trim()) return 0;
            try { return Roll.safeEval(formula.replace(/\[NE\]/gi, ne)); }
            catch { return '?'; }
        };

        const isInvocador = this.item.actor?.system?.mystic?.summoning?.specialization?.value === 'invocador';

        const updatePowerBadges = (pi) => {
            const ne = parseInt(html.find(`input[name="system.powers.${pi}.ne.value"]`).val()) || 0;
            for (const field of ['atk', 'def', 'damage', 'rm']) {
                const formula = html.find(`input[name="system.powers.${pi}.${field}Formula.value"]`).val();
                html.find(`.ss-final-badge[data-power="${pi}"][data-field="${field}"]`).text(evalFormula(formula, ne));
            }
        };

        const updatePowerZeon = (pi) => {
            const base = parseInt(html.find(`input[name="system.powers.${pi}.zeon.base.value"]`).val()) || 0;
            const final = isInvocador ? Math.ceil(base / 2) : base;
            html.find(`.ss-zeon-final[data-power="${pi}"]`).text(final);
        };

        // Wire live updates for formula/NE/zeon inputs
        html.find('.ss-formula-input, .ss-zeon-base-input, .ss-ne-input').on('input', function() {
            const container = this.closest('[data-power-index]');
            const pi = parseInt(container?.dataset.powerIndex ?? 0);
            updatePowerBadges(pi);
            updatePowerZeon(pi);
        });

        // Restore accordion states saved before re-render (takes priority over template defaults)
        if (this._accordionStates) {
            const saved = this._accordionStates;
            this._accordionStates = null;
            html.find('.ss-power-accordion').each(function() {
                const idx = parseInt(this.dataset.powerIndex);
                if (idx in saved) this.open = saved[idx];
            });
        } else {
            // Open the correct power accordion when the sheet is first opened from the actor tab
            const initialPower = this._initialPowerIndex ?? 0;
            if (initialPower > 0) {
                html.find('.ss-power-accordion').each(function(i) {
                    if (i === initialPower) this.open = true;
                    else if (i === 0) this.open = false;
                });
            }
        }

        // Add new power button
        html.find('.ss-add-power').click(async () => {
            const powers = foundry.utils.deepClone(this.item.system.powers ?? []);
            powers.push({ ...INITIAL_POWER_DATA });
            await this.item.update({ 'system.powers': powers });
        });

        // Remove power button
        html.find('.ss-remove-power').click(async (e) => {
            const pi = parseInt(e.currentTarget.dataset.powerIndex);
            const powers = foundry.utils.deepClone(this.item.system.powers ?? []);
            if (powers.length <= 1) return; // always keep at least one
            powers.splice(pi, 1);
            await this.item.update({ 'system.powers': powers });
        });
    }
}
