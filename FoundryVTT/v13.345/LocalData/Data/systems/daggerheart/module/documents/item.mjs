/**
 * Override and extend the basic Item implementation.
 * @extends {foundry.documents.Item}
 */
export default class DHItem extends foundry.documents.Item {
    /** @inheritDoc */
    prepareEmbeddedDocuments() {
        super.prepareEmbeddedDocuments();
        for (const action of this.system.actions ?? []) action.prepareData();
    }

    /**
     * @inheritdoc
     * @param {object} options - Options which modify the getRollData method.
     * @returns
     */
    getRollData(options = {}) {
        let data;
        if (this.system.getRollData) data = this.system.getRollData(options);
        else {
            const actorRollData = this.actor?.getRollData(options) ?? {};
            data = { ...actorRollData, item: { ...this.system } };
        }

        if (data?.item) {
            data.item.flags = { ...this.flags };
            data.item.name = this.name;
        }
        return data;
    }

    /**
     * Determine if this item is classified as an inventory item based on its metadata.
     * @returns {boolean} Returns `true` if the item is an inventory item.
     */
    get isInventoryItem() {
        return this.system.constructor.metadata.isInventoryItem ?? false;
    }

    /** @inheritdoc */
    static async createDialog(data = {}, createOptions = {}, options = {}) {
        const { folders, types, template, context = {}, ...dialogOptions } = options;

        if (types?.length === 0) {
            throw new Error('The array of sub-types to restrict to must not be empty.');
        }

        const documentTypes = this.TYPES.filter(type => type !== 'base' && (!types || types.includes(type))).map(
            type => {
                const labelKey = CONFIG.Item?.typeLabels?.[type];
                const label = labelKey && game.i18n.has(labelKey) ? game.i18n.localize(labelKey) : type;

                const isInventoryItem = CONFIG.Item.dataModels[type]?.metadata?.isInventoryItem;
                const group =
                    isInventoryItem === true
                        ? 'Inventory Items'
                        : isInventoryItem === false
                            ? 'Character Items'
                            : 'Other';

                return { value: type, label, group };
            }
        );

        if (!documentTypes.length) {
            throw new Error('No document types were permitted to be created.');
        }

        const sortedTypes = documentTypes.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

        return await super.createDialog(data, createOptions, {
            folders,
            types,
            template,
            context: { types: sortedTypes, ...context },
            ...dialogOptions
        });
    }

    async selectActionDialog() {
        const content = await foundry.applications.handlebars.renderTemplate(
            'systems/daggerheart/templates/views/actionSelect.hbs',
            { actions: this.system.actions }
        ),
            title = 'Select Action',
            type = 'div',
            data = {};
        return Dialog.prompt({
            title,
            // label: title,
            content,
            type,
            callback: html => {
                const form = html[0].querySelector('form'),
                    fd = new foundry.applications.ux.FormDataExtended(form);
                return this.system.actions.find(a => a._id === fd.object.actionId);
            },
            rejectClose: false
        });
    }

    async use(event) {
        const actions = this.system.actions;
        let response;
        if (actions?.length) {
            let action = actions[0];
            if (actions.length > 1 && !event?.shiftKey) {
                // Actions Choice Dialog
                action = await this.selectActionDialog();
            }
            if (action) response = action.use(event);
        }
        return response;
    }

    async toChat(origin) {
        const cls = getDocumentClass('ChatMessage');
        const systemData = {
            title:
                this.type === 'ancestry'
                    ? game.i18n.localize('DAGGERHEART.Chat.FoundationCard.AncestryTitle')
                    : this.type === 'community'
                        ? game.i18n.localize('DAGGERHEART.Chat.FoundationCard.CommunityTitle')
                        : game.i18n.localize('DAGGERHEART.Chat.FoundationCard.SubclassFeatureTitle'),
            origin: origin,
            img: this.img,
            name: this.name,
            description: this.system.description,
            actions: []
        };
        const msg = new cls({
            type: 'abilityUse',
            user: game.user.id,
            system: systemData,
            content: await foundry.applications.handlebars.renderTemplate(
                'systems/daggerheart/templates/chat/ability-use.hbs',
                systemData
            )
        });

        cls.create(msg.toObject());
    }
}
