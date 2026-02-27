import { ABFSystemName } from '../../../animabf-guote.name.js';

const TEMPLATE_PATH = `systems/${ABFSystemName}/templates/dialog/combat/defense-preset-edit/defense-preset-edit-dialog.hbs`;

/**
 * Dialog for editing an existing defense preset.
 * Opens without requiring an active attack message.
 */
export class DefensePresetEditDialog extends FormApplication {
    constructor(actor, presetItem) {
        const sys = presetItem.system;

        const initialData = {
            ui: {
                activeTab: sys.defenseType?.value ?? 'combat',
                hasFatiguePoints: actor.system.characteristics.secondaries.fatigue.value > 0,
            },
            name: presetItem.name,
            preset: {
                defenseType: sys.defenseType?.value ?? 'combat',
                combat: {
                    modifier: sys.combat?.modifier?.value ?? 0,
                    fatigue: sys.combat?.fatigue?.value ?? 0,
                    weaponUsed: sys.combat?.weaponUsed?.value ?? '',
                    method: sys.combat?.method?.value ?? 'dodge',
                    atBonus: sys.combat?.atBonus?.value ?? 0,
                },
                mystic: {
                    modifier: sys.mystic?.modifier?.value ?? 0,
                    projectionType: sys.mystic?.projectionType?.value ?? 'defensive',
                    spellUsed: sys.mystic?.spellUsed?.value ?? '',
                    spellGrade: sys.mystic?.spellGrade?.value ?? 'base',
                },
                psychic: {
                    modifier: sys.psychic?.modifier?.value ?? 0,
                    potentialBonus: sys.psychic?.potentialBonus?.value ?? 0,
                    powerUsed: sys.psychic?.powerUsed?.value ?? '',
                },
                summon: {
                    modifier: sys.summon?.modifier?.value ?? 0,
                    summonUsed: sys.summon?.summonUsed?.value ?? '',
                },
            },
        };

        super(initialData);
        this.actor = actor;
        this.presetItem = presetItem;
        this.modalData = initialData;

        this._tabs[0].active = initialData.ui.activeTab;
        this._tabs[0].callback = (event, tabs, tabName) => {
            this.modalData.ui.activeTab = tabName;
            this.modalData.preset.defenseType = tabName;
            this.render(true);
        };

        this.render(true);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['abf-dialog', 'defense-preset-edit-dialog'],
            submitOnChange: true,
            closeOnSubmit: false,
            width: 480,
            height: 'auto',
            resizable: true,
            template: TEMPLATE_PATH,
            title: game.i18n.localize('anima.ui.combat.editDefensePreset'),
            tabs: [{
                navSelector: '.sheet-tabs',
                contentSelector: '.sheet-body',
                initial: 'combat'
            }]
        });
    }

    getData() {
        this.modalData.ui.hasFatiguePoints =
            this.actor.system.characteristics.secondaries.fatigue.value > 0;
        return {
            ...this.modalData,
            actor: this.actor,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        const presetInput = html.find('.preset-name-input');
        const saveButton = html.find('.save-defense-preset-edit');

        const updateSaveButtonState = () => {
            const hasValue = presetInput.val()?.trim().length > 0;
            saveButton.prop('disabled', !hasValue);
        };

        presetInput.on('input keyup', (e) => {
            this.modalData.name = e.target.value;
            updateSaveButtonState();
        });

        updateSaveButtonState();

        saveButton.click(async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this._savePreset();
        });
    }

    async _updateObject(event, formData) {
        this.modalData = mergeObject(this.modalData, formData);
        this.render();
    }

    async _savePreset() {
        const { name, preset } = this.modalData;
        const presetName = (typeof name === 'string' ? name.trim() : '') || this.presetItem.name;

        const updatedSystem = {
            defenseType: { value: preset.defenseType || 'combat' },
            combat: {
                modifier: { value: Number(preset.combat?.modifier) || 0 },
                fatigue: { value: Number(preset.combat?.fatigue) || 0 },
                weaponUsed: { value: preset.combat?.weaponUsed || '' },
                method: { value: preset.combat?.method || 'dodge' },
                atBonus: { value: Number(preset.combat?.atBonus) || 0 },
            },
            mystic: {
                modifier: { value: Number(preset.mystic?.modifier) || 0 },
                projectionType: { value: preset.mystic?.projectionType || 'defensive' },
                spellUsed: { value: preset.mystic?.spellUsed || '' },
                spellGrade: { value: preset.mystic?.spellGrade || 'base' },
            },
            psychic: {
                modifier: { value: Number(preset.psychic?.modifier) || 0 },
                potentialBonus: { value: Number(preset.psychic?.potentialBonus) || 0 },
                powerUsed: { value: preset.psychic?.powerUsed || '' },
            },
            summon: {
                modifier: { value: Number(preset.summon?.modifier) || 0 },
                summonUsed: { value: preset.summon?.summonUsed || '' },
            },
        };

        await this.presetItem.update({ name: presetName, system: updatedSystem });
        ui.notifications.info(game.i18n.format('anima.notifications.presetSaved', { name: presetName }));
        this.close();
    }
}
