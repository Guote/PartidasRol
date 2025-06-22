import "../../../../actor/ABFActor.js";
const canOwnerReceiveMessage = (actor) => {
  if (!actor.hasPlayerOwner || !actor.id) {
    return false;
  }
  const activePlayers = game.users.players.filter((u) => u.active);
  return activePlayers.filter((u) => actor.testUserPermission(u, "OWNER")).length === 1;
};
export {
  canOwnerReceiveMessage
};
