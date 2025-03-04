export const splitAsActorAndItemChanges = (changes) => {
    const actorChanges = {};
    const itemsChanges = {};
    for (const key of Object.keys(changes)) {
        if (key.includes('.data.')) {
            console.warn(`AnimaBF | Possible old .data. property being used in ${key}`);
        }
        if (key.startsWith('system.dynamic')) {
            if (key.includes('..')) {
                console.warn(`Key ${key} is not valid`);
            }
            itemsChanges[key] = changes[key];
        }
        else {
            actorChanges[key] = changes[key];
        }
    }
    return [actorChanges, itemsChanges];
};
