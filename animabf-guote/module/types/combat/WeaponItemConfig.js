import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { mutateWeapon } from "../../items/utils/prepareItem/items/mutateWeapon.js";
export var WeaponEquippedHandType;
(function (WeaponEquippedHandType) {
    WeaponEquippedHandType["ONE_HANDED"] = "one-handed";
    WeaponEquippedHandType["TWO_HANDED"] = "two-handed";
})(WeaponEquippedHandType || (WeaponEquippedHandType = {}));
export var WeaponKnowledgeType;
(function (WeaponKnowledgeType) {
    WeaponKnowledgeType["KNOWN"] = "known";
    WeaponKnowledgeType["SIMILAR"] = "similar";
    WeaponKnowledgeType["MIXED"] = "mixed";
    WeaponKnowledgeType["DIFFERENT"] = "different";
})(WeaponKnowledgeType || (WeaponKnowledgeType = {}));
export var WeaponCritic;
(function (WeaponCritic) {
    WeaponCritic["CUT"] = "cut";
    WeaponCritic["IMPACT"] = "impact";
    WeaponCritic["THRUST"] = "thrust";
    WeaponCritic["HEAT"] = "heat";
    WeaponCritic["ELECTRICITY"] = "electricity";
    WeaponCritic["COLD"] = "cold";
    WeaponCritic["ENERGY"] = "energy";
})(WeaponCritic || (WeaponCritic = {}));
export var NoneWeaponCritic;
(function (NoneWeaponCritic) {
    NoneWeaponCritic["NONE"] = "-";
})(NoneWeaponCritic || (NoneWeaponCritic = {}));
export var WeaponManageabilityType;
(function (WeaponManageabilityType) {
    WeaponManageabilityType["ONE_HAND"] = "one_hand";
    WeaponManageabilityType["TWO_HAND"] = "two_hands";
    WeaponManageabilityType["ONE_OR_TWO_HAND"] = "one_or_two_hands";
})(WeaponManageabilityType || (WeaponManageabilityType = {}));
export var WeaponShotType;
(function (WeaponShotType) {
    WeaponShotType["SHOT"] = "shot";
    WeaponShotType["THROW"] = "throw";
})(WeaponShotType || (WeaponShotType = {}));
export var WeaponSize;
(function (WeaponSize) {
    WeaponSize["SMALL"] = "small";
    WeaponSize["MEDIUM"] = "medium";
    WeaponSize["BIG"] = "big";
})(WeaponSize || (WeaponSize = {}));
export var WeaponSizeProportion;
(function (WeaponSizeProportion) {
    WeaponSizeProportion["NORMAL"] = "normal";
    WeaponSizeProportion["ENORMOUS"] = "enormous";
    WeaponSizeProportion["GIANT"] = "giant";
})(WeaponSizeProportion || (WeaponSizeProportion = {}));
export const INITIAL_WEAPON_DATA = {
    equipped: { value: false },
    isShield: { value: false },
    special: { value: '' },
    hasOwnStr: { value: false },
    integrity: {
        base: { value: 0 },
        final: { value: 0 }
    },
    breaking: {
        base: { value: 0 },
        final: { value: 0 }
    },
    attack: {
        special: { value: 0 },
        final: { value: 0 }
    },
    block: {
        special: { value: 0 },
        final: { value: 0 }
    },
    damage: {
        base: { value: 0 },
        final: { value: 0 }
    },
    initiative: {
        base: { value: 0 },
        final: { value: 0 }
    },
    presence: {
        base: { value: 0 },
        final: { value: 0 }
    },
    size: { value: WeaponSize.MEDIUM },
    sizeProportion: { value: WeaponSizeProportion.NORMAL },
    strRequired: {
        oneHand: {
            base: { value: 0 },
            final: { value: 0 }
        },
        twoHands: {
            base: { value: 0 },
            final: { value: 0 }
        }
    },
    quality: { value: 0 },
    oneOrTwoHanded: { value: WeaponEquippedHandType.ONE_HANDED },
    knowledgeType: { value: WeaponKnowledgeType.KNOWN },
    manageabilityType: { value: WeaponManageabilityType.ONE_HAND },
    shotType: { value: WeaponShotType.SHOT },
    isRanged: { value: false },
    cadence: { value: '' },
    range: {
        base: { value: 0 },
        final: { value: 0 }
    },
    reload: {
        base: { value: 0 },
        final: { value: 0 }
    },
    weaponStrength: {
        base: { value: 0 },
        final: { value: 0 }
    },
    critic: {
        primary: { value: WeaponCritic.CUT },
        secondary: { value: NoneWeaponCritic.NONE }
    }
};
export const WeaponItemConfig = {
    type: ABFItems.WEAPON,
    isInternal: false,
    hasSheet: true,
    fieldPath: ['combat', 'weapons'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.weapons;
    },
    selectors: {
        addItemButtonSelector: 'add-weapon',
        containerSelector: '#weapons-context-menu-container',
        rowSelector: '.weapon-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.weapons.content')
        });
        const itemData = {
            name,
            type: ABFItems.WEAPON,
            data: INITIAL_WEAPON_DATA
        };
        await actor.createItem(itemData);
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            actor.updateItem({
                id,
                name,
                data
            });
        }
    },
    onAttach: (data, item) => {
        const combat = data.combat;
        const items = combat.weapons;
        item.system = foundry.utils.mergeObject(item.system, INITIAL_WEAPON_DATA, { overwrite: false });
        if (items) {
            const itemIndex = items.findIndex(i => i._id === item._id);
            if (itemIndex !== -1) {
                items[itemIndex] = item;
            }
            else {
                items.push(item);
            }
        }
        else {
            combat.weapons = [item];
        }
        combat.weapons = combat.weapons.map(weapon => {
            if (weapon.system.isRanged && typeof weapon.system.ammoId === 'string' && !!weapon.system.ammoId) {
                const ammo = combat.ammo;
                weapon.system.ammo = ammo.find(i => i._id === weapon.system.ammoId);
            }
            return weapon;
        });
    },
    prepareItem(data) {
        mutateWeapon(data);
    }
};
