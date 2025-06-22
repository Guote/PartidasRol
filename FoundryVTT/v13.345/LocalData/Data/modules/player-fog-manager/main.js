class PlayerFogLayer extends CanvasLayer {
  static get layerOptions() {
    return {
      name: "playerFogLayer",
      canDragCreate: false,
      zIndex: 200,
    };
  }

  constructor() {
    super();
    console.log("🟢 PlayerFogLayer initialized");
  }

  draw() {
    console.log("🎨 Drawing PlayerFogLayer...");
    this.graphics = new PIXI.Graphics();
    this.addChild(this.graphics);
    return this;
  }

  activate() {
    super.activate();
    console.log("✅ PlayerFogLayer activated");
  }

  deactivate() {
    super.deactivate();
    console.log("🛑 PlayerFogLayer deactivated");
  }
}

Hooks.once("init", () => {
  console.log("🔧 Registering PlayerFogLayer");
  CONFIG.Canvas.layers.playerFogLayer = {
    layerClass: PlayerFogLayer,
    group: "primary",
  };
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;

  controls["player-fog"] = {
    name: "player-fog",
    title: "Player Fog",
    icon: "fas fa-cloud",
    layer: "playerFogLayer",
    activeTool: "fog-tool",
    onChange: (event, active) => {
      if (active) canvas.playerFogLayer?.activate();
    },
    onToolChange: (event, tool) => {
      console.log(`🛠️ Tool changed to: ${tool}`);
    },
    tools: {
      "fog-tool": {
        name: "fog-tool",
        title: "Fog Tool",
        icon: "fas fa-smog",
        toggle: false,
        button: true,
        onClick: () => {
          ui.notifications.info("🛠️ Fog tool clicked (but not implemented)");
        },
      },
    },
  };
});
