/*
 * Global FogManager Configuration Options
 */

export default [
    {
        name: 'userModes',
        data: {
            name: 'User Read/Write Modes',
            scope: 'world',
            config: false,
            type: Object,
            default: null,
        },
    },
    {
        name: 'autoShare',
        data: {
            name: 'Automatic sharing of fog updates',
            scope: 'world',
            config: false,
            type: Boolean,
            default: false,
        },
    },
    {
        name: 'saveHistory',
        data: {
            name: "Persist editor history between reloads.",
            hint: "This can cause large scene.db files so don't enable on shared hosting.",
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
        },
    },
    {
        name: 'cleanedHistory',
        data: {
            name: 'Has a history cleanup been preformed',
            scope: 'world',
            config: false,
            type: Boolean,
            default: false,
        },
    },
];
