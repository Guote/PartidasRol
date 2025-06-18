import { cardStackSettings } from "./tools.js";
import { DeckParameters } from "./constants.js";


const parseNumberOrNull = (value) => {
    try {
        return parseInt(value);
    } catch( e ) {
        return null;
    }
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
 * Service manipulating StackConfigurationGroup structure and flags to know which actions are available
 */
export class ParameterParserService {

    /**
     * For core parameters which are not linked to any actions
     * @param {string} stackKey The stack key, as defined in flags
     * @param {string} paramName The param name
     */
    getCoreParam(stackKey, paramName) {
        const parameters = settings_allParameters(stackKey);
        const paramKey = "core-" + paramName;
        return parameters[paramKey];
    }

    /**
     * CoreParam 'revealedFaceDown' possess a default value : false
     * @param {string} stackKey The stack key, as defined in flags
     * @returns TRUE/FALSE (Default: False)
     */
    areRevealedCardsPutFaceDown(stackKey) {
        const result = this.getCoreParam(stackKey, DeckParameters.revealedFaceDown);
        return result ?? false;
    }

    /**
     * Convenience function to easily retrieve a parameter for a given action.
     * You may want to directly manipulate the actiongroupDetails if you have multiple parameters to retrieve
     * @param {string} stackKey The stack key, as defined in flags
     * @param {string} actionGroupId The actionGroup id, as defined in StackConfigurationGroup
     * @param {string} action Action name
     * @param {string} paramName The param name
     */
    getParam(stackKey, actionGroupId, action, paramName) {
        const actionService = game.modules.get('ready-to-use-cards').actionService;
        const groupDetail = actionService.getActionGroupDetails(stackKey, [actionGroupId]);
        return groupDetail.parameters.find( p => p.param === paramName && p.action === action );
    }

    /**
     * Boolean is set as 0 or 1 in parameter
     * @param {string} paramValue The parameter value
     * @returns {boolean} 
     */
    parseBoolean(paramValue) {
        let val = paramValue.trim();
        return val != "0";
    }

    /**
     * Parameter should be a card attribute, a numeric, or a range.
     * If a cardAttribute, should be in the form $xxx. We will try to retrieve card[xxxx]. 
     * Example : $value
     * 
     * If a numeric, should be a simple number.
     * Example: 1
     * 
     * If a range, should be in the for <min>-<max>
     * Examples: 0-3
     * 
     * If none match, will return 0-0
     * 
     * @param {Card} card the selected card
     * @param {string} paramValue See above for the possibilities
     * @returns {min: int, max: int} A range. If parsing returns only a number, min and max will have the same value
     */
    parseCardAttributeOrRangleValue(card, paramValue) {

        let numberOrRange = paramValue;
        if( paramValue.startsWith("$") ) {
            numberOrRange = "" + this.parseCardAttribute(card, paramValue);
        }

        numberOrRange = numberOrRange.trim();
        let minString = numberOrRange;
        let maxString = numberOrRange;
        if( numberOrRange.includes("-") ) {
            const parsed = numberOrRange.split("-");
            minString = parsed[0];
            maxString = parsed[1] ?? "0";
        }

        const min = parseNumberOrNull(minString);
        const max = parseNumberOrNull(maxString);
        return {
            min: min != null ? min : 0,
            max: max != null ? max : 1
        };
    }


    /**
     * Should be in the form $xxx. We will try to retrieve card[xxxx]. 
     * Example : $value
     * 
     * Othewise, will directly return cardAttribute
     * 
     * @param {Card} card the selected card
     * @param {string} cardAttribute in the form of $value
     * @returns {string} The parse value. null if card doesn't have this attribute
     */
    parseCardAttribute(card, cardAttribute) {

        if( !cardAttribute.startsWith("$") ) {
            return cardAttribute;
        }

        let path = cardAttribute.substring(1).split(".");
        let leaf = card;
        for( let key of path ) {
            if(!leaf) { break; }
            leaf = leaf[key];
        }
        return leaf ?? null;
    }

}