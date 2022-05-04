export const splitAsActorAndItemChanges = (changes) => {
    const actorChanges = {};
    const itemsChanges = {};
    for (const key of Object.keys(changes)) {
        if (key.startsWith('data.dynamic')) {
            itemsChanges[key] = changes[key];
        }
        else {
            actorChanges[key] = changes[key];
        }
    }
    return [actorChanges, itemsChanges];
};
