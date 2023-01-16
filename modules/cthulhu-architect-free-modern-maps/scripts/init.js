Hooks.once("ready", async function () {
    if (game.user.isGM && !game.user.getFlag("cthulhu-architect-free-modern-maps", "welcomeMessageShown")) {
        renderTemplate("modules/cthulhu-architect-free-modern-maps/templates/welcomeMessage.html", {}).then((html) => {
            let options = {
                whisper: [game.user.id],
                content: html
            };
            ChatMessage.create(options);
        });
         await game.user.setFlag("cthulhu-architect-free-modern-maps", "welcomeMessageShown", true);
    }
});
