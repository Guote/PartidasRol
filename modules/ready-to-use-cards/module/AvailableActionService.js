import { StackConfigurationGroup } from "./constants.js";
import { cardStackSettings, updateCardStackSettings } from "./tools.js";


/**
 * List all action settings for a stack
 * @param {string} stackKey stack key in the flags
 * @returns {object} One child for each action. key: {groupId}-{from}{target}
 */
const settings_allActions = (stackKey) => {
    const settings = cardStackSettings();
    if( !settings.hasOwnProperty( stackKey ) ) { return {}; }

    return settings[stackKey].actions ?? {};
}

/**
 * List all label settings for a stack
 * @param {string} stackKey stack key in the flags
 * @returns {object} One child for each label. key: {groupId}-{action}
 */
const settings_allLabels = (stackKey) => {
    const settings = cardStackSettings();
    if( !settings.hasOwnProperty( stackKey ) ) { return {}; }

    return settings[stackKey].labels ?? {};
}

/**
 * List all parameters settings for a stack
 * @param {string} stackKey stack key in the flags
 * @returns {object} One child for each parameter. key: {groupId}-{action}-{param}
 */
 const settings_allParameters = (stackKey) => {
    const settings = cardStackSettings();
    if( !settings.hasOwnProperty( stackKey ) ) { return {}; }

    return settings[stackKey].parameters ?? {};
}

/**
 * Retrieve the constant definition of an action group.
 * This service is the only one parsing the complex StackConfigurationGroup object.
 * The StackConfigurationGroup structure is abstracted via the AvailableActionService methods
 * @param {string} actionGroupId As defined in StackConfigurationGroup
 * @returns {object} See StackConfigurationGroup for its structure.
 */
const definition_actionGroup = (actionGroupId) => {
    const result = duplicate( StackConfigurationGroup[actionGroupId] );
    result.id = actionGroupId;
    return result;
}

/**
 * Each action have a label that will be displayed in GUI button.
 * A label have a default value and a current value that can be overriden by user settings (otherwise, its the same as the default one)
 * @param {string} stackKey The stack key, as defined in flags
 * @param {object} actionGroup See StackConfigurationGroup for its structure.
 * @returns {object[]} A list of labels, one for each action
 */
const buildActionGroupDetailsLabels = (stackKey, actionGroup) => {
    const allLabelSettings = settings_allLabels(stackKey);
    const defaultLabels = actionGroup.labels.map( l => {
        return {
            confKey: actionGroup.id + "-" + l.action,
            action: l.action,
            default: game.i18n.localize(l.default)
        };
    });
    return defaultLabels.map( l => {
        const data = {
            confKey: l.confKey, 
            action: l.action,
            default: l.default,
            current: l.default
        };

        const label = allLabelSettings[l.confKey];
        if( label ) {
            data.current = label;
        }
        return data;
    });
}

/**
 * Complete actionGroup.available by adding data related to user settings.
 * Meaning : if it is used, and the action name
 * @param {string} stackKey The stack key, as defined in flags
 * @param {object} actionGroup See StackConfigurationGroup for its structure.
 * @param {object[]} labels See buildActionGroupDetailsLabels
 * @returns {object[]} A list of available actions. Action is repeated each time it is useable for a {from, target} couple
 */
const buildActionGroupDetailsActions = (stackKey, actionGroup, labels) => {

    const allActionSettings = settings_allActions(stackKey);
    return actionGroup.available.map( a => {

        // Toggling action in settings are stored this way
        const confKey = actionGroup.id + "-" + a.from + a.target;

        // Custom labels are stored in settings this way
        const action = a.action;
        const label = labels.find( l => l.action === action );

        const data = {
            confKey: confKey,
            actionGroupId: actionGroup.id,
            action: action,
            from: a.from,
            target: a.target,
            available: allActionSettings[confKey] ?? false,
            name: {
                default: label.default,
                current: label.current
            }
        };
        return data;
    });
}

const buildActionGroupDetailsParameters = (stackKey, actionGroup) => {
    const allActionParameters = settings_allParameters(stackKey);
    const parameters = (actionGroup.parameters ?? []).map( p => {
        const data = {
            confKey: actionGroup.id + "-" + p.action + "-" + p.param,
            action: p.action,
            param: p.param,
            label: game.i18n.localize(p.label),
            default: p.default,
            current: p.default
        };
        data.id = stackKey + "-" + data.confKey;

        // current label
        if( allActionParameters.hasOwnProperty(data.confKey) ) {
            data.current = allActionParameters[data.confKey];
        }

        // input validation pattern
        const validation = INPUT_VALIDATION[p.validation ?? ""];
        if( validation ) {
            data.validation = {
                tooltip: game.i18n.localize(validation.tooltipKey),
                pattern: validation.pattern,
                datalist: validation.datalist
            };
        }
        return data;
    });
    return parameters;
}

/**
 * Some parameters imput need a validation pattern
 */
const INPUT_VALIDATION = {
    boolean: {
        tooltipKey: "0 and 1 are the only accepted values",
        pattern: "[0-1]",
        datalist: ["0", "1"]
    },
    playMode: {
        tooltipKey: "Cost parameters are only taken into account if you choose 'discardCardsAsCost' or 'otherCost'",
        datalist: ["singleCard", "multipleCards", "discardCardsAsCost", "otherCost"]
    },
    cardAtrribute: {
        tooltipKey: "Should be a card attribute, a numeric, or a range. Will try to retrieve card[xxx] for $xxx. Examples: $value, 2, 0-3",
        pattern: "(\\$[a-zA-Z0-9_\\-\\.]*)|([0-9]+)|([0-9]+-[0-9]+)",
    },

}

/**
 * Service manipulating StackConfigurationGroup structure and flags to know which actions are available
 */
export class AvailableActionService {

    /**
     * Create base settings for a new stack
     * @param {Cards} stack : The stack which will be soon registered
     * @returns {object}
     */
    createSettingsForNewStack(stack) {
        const actions = {};
        actions["dealCard-GHDE"] = true;
        actions["dealCard-GRDE"] = true;
        actions["dealCard-PHDE"] = true;
        actions["dealCard-PRDE"] = true;

        const parameters = {};
        const defaultParameters = stack.getFlag('ready-to-use-cards', 'default-parameters');
        parameters["core-labelBaseKey"] = defaultParameters?.labelBaseKey ?? "RTUCards.default.";
        parameters["core-resourceBaseDir"] = defaultParameters?.resourceBaseDir ?? "";
        parameters["core-removeBackFace"] = false;

        return {
            actions: actions,
            parameters: parameters,
            labels: {}
        };
    }

    /**
     * List of all possible actions for an actionGroup
     * For each action, see if it as been enabled for this stack
     * @param {string} stackKey The stack key, as defined in flags
     * @param {string} actionGroupId The actionGroup id, as defined in StackConfigurationGroup
     * @returns {object[]} Data for each action. See structure bellow
     */
    getActionGroupDetails(stackKey, actionGroupId) {

        const actionGroup = definition_actionGroup(actionGroupId);
        if( !actionGroup ) { return null; }

        const result = {
            name: game.i18n.localize(actionGroup.labelKey),
            description: game.i18n.localize(actionGroup.descKey),
            actionType: actionGroup.actionType, // Retrieved as it is
            grid: actionGroup.grid // Retrieved as it is
        };

        result.labels = buildActionGroupDetailsLabels(stackKey, actionGroup);
        result.actions = buildActionGroupDetailsActions(stackKey, actionGroup, result.labels);
        result.parameters = buildActionGroupDetailsParameters(stackKey, actionGroup);

        return result;
    }

    /**
     * Summary of all action group for a given stack
     * @param {string} stackKey The stack key, as defined in flags
     * @returns {object} Each child represents one of the action group. Action details are in subchild 'actions'
     */
     getAllActionsDetailsMap(stackKey) {
        const result = Object.keys(StackConfigurationGroup).reduce( (_result, key) => {
            _result[key] = this.getActionGroupDetails(stackKey, key);
            return _result;
        }, {});
        return result;
    }

    /**
     * Persist new definition after it has been edited inside ConfigSheetForActions
     * @param {object[]} wholeDetails An array of { stackKey: string, details: actionsDetails[] }
     */
    async updateSettingsWithCurrentActionDetails(wholeDetails) {

        const newSettings = {};
        wholeDetails.forEach( stackData => {
            const stackSettings = { actions: {}, labels: {}, parameters: {} };

            // Core parameters :
            Object.entries(stackData.coreParameters).forEach( ([key, value]) => {
                const paramKey = "core-" + key;
                stackSettings.parameters[paramKey] = value;
            });

            const retrieveDefaultConf = stackData.coreParameters.hasOwnProperty("overrideConf") && !stackData.coreParameters.overrideConf;
            if( retrieveDefaultConf ) { 
                // Retrieve conf from actual definition
                const def = game.modules.get('ready-to-use-cards').stacksDefinition;
                const defaultSettings = def.core[stackData.key]?.defaultSettings ?? {};
                const defaultActions = defaultSettings.actions ?? {};
                const defaultLabel = defaultSettings.labels ?? {};
                const defaultParameters = defaultSettings.parameters ?? {};

                foundry.utils.mergeObject(stackSettings.actions, defaultActions);
                foundry.utils.mergeObject(stackSettings.labels, defaultLabel);
                foundry.utils.mergeObject(stackSettings.parameters, defaultParameters);

            } else {
                // Take what was given in input
                Object.values(stackData.details).forEach( actionGroup => {

                    // Persist action choices
                    const usedActions = actionGroup.actions.filter( a => a.available );
                    usedActions.forEach( a => stackSettings.actions[a.confKey] = true );

                    // Persist labels
                    const distinctActionKeys = usedActions.reduce( (_distinct, a) => {
                        if( !_distinct.includes(a.action) ) { _distinct.push( a.action ); }
                        return _distinct;
                    }, []);
                    distinctActionKeys.forEach( actionKey => {
                        const labelDef = actionGroup.labels.find( l => l.action === actionKey );
                        if( labelDef.current != labelDef.default ) {
                            stackSettings.labels[labelDef.confKey] = labelDef.current;
                        }
                    });

                    // Persist parameters
                    actionGroup.parameters.filter( p => {
                        return distinctActionKeys.includes(p.action);
                    }).filter( p => {
                        return p.current != p.default;
                    }).forEach( p => {
                        stackSettings.parameters[p.confKey] = p.current;
                    });
                });

            }


            // Persist only if there is some data set for this stack
            if( Object.keys(stackSettings.actions).length > 0 || Object.keys(stackSettings.parameters).length > 0 ) {
                newSettings[stackData.key] = stackSettings;
            }
        });

        /* For Testing

        const currentSettings = cardStackSettings();
        const toString = (obj) => {
            const keys = Object.keys(obj);
            keys.sort();
            return keys.join("\n");
        }

		const currentActions = toString(currentSettings["pokerDark"]?.actions ?? {});
		const newSettingsActions = toString(newSettings["pokerDark"]?.actions ?? {});

		const currentLabels = toString(currentSettings["pokerDark"]?.labels ?? {});
		const newSettingsLabels = toString(newSettings["pokerDark"]?.labels ?? {});

        */
        await updateCardStackSettings(newSettings);
        return newSettings;
    }
    
    
    /**
     * Reduce the whole list by taking only the available actions.
     * Actions are then filtered by .action and formated in an easy way to be processes
     * @param {string} stackKey The stack key, as defined in flags
     * @param {string} actionGroupId The actionGroup id, as defined in StackConfigurationGroup
     * @param {string} [from] Allow to filter on a .from
     * @param {string} [target] Allow to filter on a .target
     * @returns {object[]} One line for each action, with available possibilities in .possibilites
     */
    getActionPossibilities(stackKey, actionGroups, {from=null, target=null}={}) {


        const allGroupDetails = {
            actions: [],
            parameters: []
        };
        actionGroups.forEach( (actionGroup) => {
            const details = this.getActionGroupDetails(stackKey, actionGroup);
            allGroupDetails.actions.push( ...details.actions );
            allGroupDetails.parameters.push( ...details.parameters );
        });

        allGroupDetails.actions = allGroupDetails.actions.filter( action => {
            return action.available;
        }).filter( action => {
            return !from || action.from === from;
        }).filter( action => {
            return !target || action.target === target;
        });

        return allGroupDetails.actions.reduce( (_results, _current) => {

            const result = _results.find( r => r.action === _current.action );
            if( result ) {
                result.possibilities.push( {from: _current.from, target: _current.target} );
            } else {
                const signature = _current.actionGroupId + "-" + _current.action;
                const actionData = {
                    actionGroupId: _current.actionGroupId,
                    action: _current.action,
                    signature: signature,
                    name: _current.name.current,
                    possibilities: [{from: _current.from, target: _current.target}],
                    parameters: allGroupDetails.parameters.filter( p => p.confKey.startsWith( signature + "-" ))
                }

                _results.push(actionData);
            }
            return _results;

        }, []);
    }

    /**
     * DiscardAll slightly differs from other actions.
     * It's discard from discardOne actions, and only available if the parameter allowAllDiscard is true
     * @param {string} stackKey The stack key, as defined in flags
     * @param {string} [from] Allow to filter on a .from
     * @returns {object[]} Same structure as getActionPossibilities
     */
    getDiscardAllPossibilities(stackKey, {from=null}={}) {

        const moveCardDetails = this.getActionGroupDetails(stackKey, "moveCard");
        const discardActions = moveCardDetails.actions.filter( a => {
            if( !a.available ) { return false; }
            if( from && from != a.from ) { return false; }
            return a.action === "discardOne";
        });
        if( discardActions.length == 0 ) { return []; }

        const paramService = game.modules.get('ready-to-use-cards').parameterService;
        const allowAllDiscard = paramService.parseBoolean(
            moveCardDetails.parameters.find( p => p.action == "discardOne" && p.param == "discardAll" ).current
        );
        if( !allowAllDiscard ) { return []; }

        const discardAll = {
            actionGroupId: "moveCard",
            action: "discardAll",
            signature: "moveCard-discardAll",
            name: moveCardDetails.labels.find( l => l.action === "discardAll").current
        };
        discardAll.possibilities = discardActions.map( a => {
            return { from: a.from, target: a.target };
        });

        return [discardAll];
    }

    asGUIAction(possibility, {action=null} = {}) {

        let onLeftSide = [
            "peekOnCards", "dealCard", "drawDeckCard", 
            "shuffleDeck", "resetDeck", "drawDiscardCard", 
            "shuffleDiscard", "resetDiscard"].includes( possibility.actionGroupId );

        onLeftSide = onLeftSide || possibility.signature === "moveCard-discardAll";

        return {
            classes: possibility.signature,
            label: possibility.name,
            action: action,
            onLeft: onLeftSide
        }
    }

    customGUIAction(name, action) {
        return this.asGUIAction({
            signature: "custom-action",
            name: name,
        }, {action});
    }

    /**
     * Convenience function allowing to add css classes on one of the element of the guiActions list
     * Only the last on in the list correspong to afterClasses criteria will be modified.
     * If no element match the critera, nothing is done.
     * 
     * @param {object[]} guiActions See asGUIAction for structure
     * @param {string[]} afterClasses When looking for the element wich will be modified, wll only consider the one having on of the list classes. (Can be partial: xxx- or xxx-yy)
     * @param {string[]} [classesToAdd] By default, will add "separator" to the element. Can be used to changed what will be added
     */
    addCssAfterSomeGuiActions(guiActions, afterClasses, {classesToAdd=["separator"]} = {}) {

        // Find last related element
        const lastIndex = guiActions.reduce( (_lastIndex, _action, _actionIndex) => {
            const isRelated = afterClasses.some( cl => _action.classes.includes(cl));
            return isRelated ? _actionIndex : _lastIndex;
        }, -1);

        const nothingToDo = lastIndex < 0 || lastIndex >= guiActions.length;
        if( nothingToDo ) { return; }

        // Only add classes that haven't already been added
        const action = guiActions[lastIndex];
        classesToAdd.filter( css => {
            return !action.classes.includes( " " + css);
        }).forEach( css => {
            action.classes += " " + css;
        });
    }
}