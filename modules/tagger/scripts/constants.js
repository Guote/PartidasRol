const CONSTANTS = {
    MODULE_NAME: "tagger",
    TAGS: "tags",
    DATA: "data"
}

CONSTANTS["BASE_PROPERTY"] = `flags.${CONSTANTS.MODULE_NAME}`;
CONSTANTS["TAG_PROPERTY"] = `${CONSTANTS.BASE_PROPERTY}.${CONSTANTS.TAGS}`
CONSTANTS["REMOVE_TAG_PROPERTY"] = `${CONSTANTS.BASE_PROPERTY}.-=${CONSTANTS.TAGS}`
CONSTANTS["DATA_PROPERTY"] = `${CONSTANTS.BASE_PROPERTY}.${CONSTANTS.DATA}`

export default CONSTANTS;
