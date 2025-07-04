import DHBaseItemSheet from '../api/base-item.mjs';
import { actionsTypes } from '../../../data/_module.mjs';
import DHActionConfig from '../../config/Action.mjs';

export default class SubclassSheet extends DHBaseItemSheet {
    /**@inheritdoc */
    static DEFAULT_OPTIONS = {
        classes: ['subclass'],
        position: { width: 600 },
        window: { resizable: false },
        actions: {
            addFeature: this.addFeature,
            editFeature: this.editFeature,
            deleteFeature: this.deleteFeature
        }
    };

    /**@override */
    static PARTS = {
        header: { template: 'systems/daggerheart/templates/sheets/items/subclass/header.hbs' },
        tabs: { template: 'systems/daggerheart/templates/sheets/global/tabs/tab-navigation.hbs' },
        description: { template: 'systems/daggerheart/templates/sheets/global/tabs/tab-description.hbs' },
        features: {
            template: 'systems/daggerheart/templates/sheets/items/subclass/features.hbs',
            scrollable: ['.features']
        },
        settings: {
            template: 'systems/daggerheart/templates/sheets/items/subclass/settings.hbs',
            scrollable: ['.settings']
        }
    };

    /** @inheritdoc */
    static TABS = {
        primary: {
            tabs: [{ id: 'description' }, { id: 'features' }, { id: 'settings' }],
            initial: 'description',
            labelPrefix: 'DAGGERHEART.Sheets.TABS'
        }
    };

    //TODO redo everything below this message

    static addFeature(_, target) {
        if (target.dataset.type === 'action') this.addAction(target.dataset.level);
        else this.addEffect(target.dataset.level);
    }

    static async editFeature(_, target) {
        if (target.dataset.type === 'action') this.editAction(target.dataset.level, target.dataset.feature);
        else this.editEffect(target.dataset.feature);
    }

    static async deleteFeature(_, target) {
        if (target.dataset.type === 'action') this.removeAction(target.dataset.level, target.dataset.feature);
        else this.removeEffect(target.dataset.level, target.dataset.feature);
    }

    async #selectActionType() {
        const content = await foundry.applications.handlebars.renderTemplate(
                'systems/daggerheart/templates/views/actionType.hbs',
                { types: SYSTEM.ACTIONS.actionTypes }
            ),
            title = 'Select Action Type',
            type = 'form',
            data = {};
        return Dialog.prompt({
            title,
            label: title,
            content,
            type,
            callback: html => {
                const form = html[0].querySelector('form'),
                    fd = new foundry.applications.ux.FormDataExtended(form);
                foundry.utils.mergeObject(data, fd.object, { inplace: true });
                return data;
            },
            rejectClose: false
        });
    }

    async addAction(level) {
        const actionType = await this.#selectActionType();
        const cls = actionsTypes[actionType?.type] ?? actionsTypes.attack,
            action = new cls(
                {
                    _id: foundry.utils.randomID(),
                    systemPath: `${level}.actions`,
                    type: actionType.type,
                    name: game.i18n.localize(SYSTEM.ACTIONS.actionTypes[actionType.type].name),
                    ...cls.getSourceConfig(this.document)
                },
                {
                    parent: this.document
                }
            );
        await this.document.update({ [`system.${level}.actions`]: [...this.document.system[level].actions, action] });
        await new DHActionConfig(
            this.document.system[level].actions[this.document.system[level].actions.length - 1]
        ).render(true);
    }

    async addEffect(level) {
        const embeddedItems = await this.document.createEmbeddedDocuments('ActiveEffect', [
            { name: game.i18n.localize('DAGGERHEART.Feature.NewEffect') }
        ]);
        await this.document.update({
            [`system.${level}.effects`]: [
                ...this.document.system[level].effects.map(x => x.uuid),
                embeddedItems[0].uuid
            ]
        });
    }

    async editAction(level, id) {
        const action = this.document.system[level].actions.find(x => x._id === id);
        await new DHActionConfig(action).render(true);
    }

    async editEffect(id) {
        const effect = this.document.effects.get(id);
        effect.sheet.render(true);
    }

    async removeAction(level, id) {
        await this.document.update({
            [`system.${level}.actions`]: this.document.system[level].actions.filter(action => action._id !== id)
        });
    }

    async removeEffect(level, id) {
        await this.document.effects.get(id).delete();
        await this.document.update({
            [`system.${level}.effects`]: this.document.system[level].effects
                .filter(x => x && x.id !== id)
                .map(effect => effect.uuid)
        });
    }
}
