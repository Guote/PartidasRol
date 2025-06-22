export const canOwnerReceiveMessage = (actor) => {
    const tgame = game;
    if (!actor.hasPlayerOwner || !actor.id) {
        return false;
    }
    const activePlayers = tgame.users.players.filter(u => u.active);
    return activePlayers.filter(u => actor.testUserPermission(u, 'OWNER')).length === 1;
};
