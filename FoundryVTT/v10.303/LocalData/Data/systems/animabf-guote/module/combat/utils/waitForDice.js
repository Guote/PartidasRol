/**
 * Wait for Dice So Nice roll animation(s) to complete.
 * Returns immediately if the dice-so-nice module is not active.
 * @param {number} [count=1] - Number of roll animations to wait for (psychic uses 2)
 * @returns {Promise<void>}
 */
export function waitForDice(count = 1) {
    if (!game.modules.get('dice-so-nice')?.active) return Promise.resolve();
    return new Promise(resolve => {
        let remaining = count;
        const hookIds = [];
        const done = () => { if (--remaining <= 0) { clearTimeout(timeoutId); resolve(); } };
        for (let i = 0; i < count; i++) hookIds.push(Hooks.once('diceSoNiceRollComplete', done));
        const timeoutId = setTimeout(() => {
            hookIds.forEach(id => Hooks.off('diceSoNiceRollComplete', id));
            resolve();
        }, 3000);
    });
}
