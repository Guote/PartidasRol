export function registerFogControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tools = [
      {
        name: "toggle",
        title: "Enable / Disable",
        icon: "fas fa-toggle-on",
        toggle: true,
      },
      { name: "user", title: "User Selection", icon: "fas fa-user-cog" },
      { name: "download", title: "Download Fog", icon: "fas fa-download" },
      { name: "upload", title: "Upload Fog", icon: "fas fa-upload" },
      { name: "brush", title: "Brush", icon: "fas fa-paint-brush" },
    ];
    controls.push({
      name: "playerFog",
      title: "Player Fog",
      icon: "fas fa-cloud-upload-alt",
      layer: "playerFogLayer",
      tools,
      activeTool: "toggle",
    });
  });
}
