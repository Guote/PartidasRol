import { warn, debug, i18n } from "../times-up.js";
import { effectQueue, saveQueue } from "./settings.js";
// remove any effects from the delete list that are tied to a concentration effect if midi is going to delete them when concentration is removed
export function removeConcentrationEffect(actor, effects) {
    if (!game.modules.get("midi-qol")?.active)
        return effects;
    if (globalThis.MidiQOL.configSettings().removeConcentrationEffects === "none")
        return effects;
    const concentrationEffect = getConcentrationEffect(actor);
    return effects?.filter((ef) => {
        // Get the origin of the effect
        //@ts-expect-error fromUuidSync ef.origin
        const origin = ef.origin && fromUuidSync(ef.origin);
        // see if the parent of the origin is concentrating
        const concentrationData = getProperty(origin?.parent, "flags.midi-qol.concentration-data");
        if (concentrationData // parent is concentrating
            //@ts-expect-error .origin
            && ef.origin === concentrationData.uuid // this effect has the same origin as the concentration on the parent
            //@ts-expect-error .id
            && ef.id !== concentrationEffect?.id)
            return false; // don'e remove the concentration effect
        return true;
    });
}
export function getConcentrationEffect(actor) {
    let concentrationLabel = i18n("midi-qol.Concentrating");
    if (game.modules.get("dfreds-convenient-effects")?.active) {
        let concentrationId = "Convenient Effect: Concentrating";
        //@ts-expect-error
        let statusEffect = CONFIG.statusEffects.find(se => se.id === concentrationId);
        if (statusEffect)
            concentrationLabel = statusEffect.label;
    }
    else if (game.modules.get("combat-utility-belt")?.active) {
        concentrationLabel = game.settings.get("combat-utility-belt", "concentratorConditionName");
    }
    const result = actor.effects.contents.find(i => i.label === concentrationLabel);
    return result;
}
export function GMAction(action, actor, effectData) {
    //@ts-ignore contents
    let intendedGM = game.users.contents.find(u => u.isGM && u.active);
    if (intendedGM.id === game.user.id) {
        warn("Gmaction", action, actor.uuid, effectData);
        switch (action) {
            case "createEffect":
                debug("create effect ", effectData, actor);
                if (hasDuration(effectData)) {
                    if (!effectData.duration.startTime)
                        effectData.duration.startTime = game.time.worldTime;
                    effectQueue.effects.set(effectData._id, { actorUuid: actor.uuid, effectData });
                    saveQueue();
                }
                break;
            case "deleteEffect":
                warn("Delete effect", actor, effectData);
                var effectDataId;
                if (typeof effectData === "string")
                    effectDataId = effectData;
                else
                    effectDataId = effectData?._id;
                if (effectQueue.effects.has(effectDataId)) {
                    effectQueue.effects.delete(effectDataId);
                    saveQueue();
                }
                break;
            case "updateEffect":
                warn("update effect", actor, effectData);
                effectQueue.effects.set(effectData._id, { actorUuid: actor.uuid, effectData });
                saveQueue();
        }
    }
}
export function TUfromUuid(uuid) {
    if (!uuid || uuid === "")
        return null;
    //@ts-ignore foundry v10 types
    return fromUuidSync(uuid);
}
export function TUfromActorUuid(uuid) {
    const doc = TUfromUuid(uuid);
    if (doc instanceof CONFIG.Token.documentClass)
        return doc.actor;
    //@ts-ignore actor.documentClass
    if (doc instanceof CONFIG.Actor.documentClass)
        return doc;
    return null;
}
export function hasDuration(effectData) {
    return effectData.duration && (effectData.duration.seconds || effectData.duration.turns || effectData.duration.rounds);
}
