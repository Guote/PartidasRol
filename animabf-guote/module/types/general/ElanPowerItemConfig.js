import { nanoid } from "../../../vendor/nanoid/nanoid.js";
import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const ElanPowerItemConfig = {
    type: ABFItems.ELAN_POWER,
    isInternal: true,
    fieldPath: [],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.elan_power;
    },
    selectors: {
        addItemButtonSelector: 'add-elan-power',
        containerSelector: '#elan-context-menu-container',
        rowSelector: '.elan-row .powers'
    },
    onCreate: async (actor, elanId) => {
        if (typeof elanId !== 'string')
            throw new Error('elanId missing');
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.elanPower.content')
        });
        const power = {
            _id: nanoid(),
            type: ABFItems.ELAN_POWER,
            name,
            data: { level: { value: 0 } }
        };
        const elan = actor.getInnerItem(ABFItems.ELAN, elanId);
        if (elan) {
            const { data } = elan;
            const powers = [];
            if (!data.powers) {
                powers.push(power);
            }
            else {
                powers.push(...[...data.powers, power]);
            }
            await actor.updateInnerItem({
                type: ABFItems.ELAN,
                id: elanId,
                data: { ...elan.data, powers }
            });
        }
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data: { elanId, level } } = changes[id];
            if (!elanId)
                throw new Error('elanId missing');
            const elan = actor.getInnerItem(ABFItems.ELAN, elanId);
            if (elan) {
                const powers = elan.data.powers;
                const elanPower = powers.find(power => power._id === id);
                if (elanPower) {
                    if (elanPower.name === name && elanPower.data.level.value === level.value)
                        continue;
                    elanPower.name = name;
                    elanPower.data.level.value = level.value;
                    actor.updateInnerItem({
                        type: ABFItems.ELAN,
                        id: elanId,
                        data: { ...elan.data, powers: [...powers] }
                    }, true);
                }
            }
        }
    },
    onDelete: (actor, target) => {
        const { elanId } = target[0].dataset;
        if (!elanId) {
            throw new Error('Data id missing. Are you sure to set data-elan-id to rows?');
        }
        const { elanPowerId } = target[0].dataset;
        if (!elanPowerId) {
            throw new Error('Data id missing. Are you sure to set data-elan-power-id to rows?');
        }
        const elan = actor.getInnerItem(ABFItems.ELAN, elanId);
        if (elan) {
            actor.updateInnerItem({
                type: ABFItems.ELAN,
                id: elanId,
                data: {
                    ...elan.data,
                    powers: elan.data.powers.filter(power => power._id !== elanPowerId)
                }
            });
        }
    }
};
