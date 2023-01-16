(async () => {
	//This has to be the name field from your module.json
	const moduleName = "baileywiki-maps";
	//This should correlate to the title field from your module.json so the user knows from where the compendium is
	const moduleLabel = "Baileywiki Maps Pack";
    const adventureName = moduleLabel;
	//This should contain all your json compendiums
	const compendiumList =[
		"import_packs/baileywiki-maps-actors.json"
	]
	//This should be the system in which you created the original compendium, in case you want to distribute that as well in your module otherwise make it blank
	const ignoreSystem = "dnd5e";
	//This should be the first part of your localization stringIds in the localization files in .\languages\ 
	const moduleLocalizationScope = "BAILEYWIKIMAPSFREECOMPENDIUM";

	/**
	 * welcomeJournal (if set) will automatically be imported and opened after the first activation of a scene imported from the module compendium.
	 * Set to the following to disable:
	 *   const welcomeJournal = '';
	 */
	const welcomeJournal = '01 Baileywiki Readme';
	/**
	 * additionalJournals will automatically be imported.
	 * Set to the following to disable:
	 *   const additionalJournals = [];
	 */
	const additionalJournals = [];
    /**
     * additionalMacros will automatically be imported.
     * Set to the following to disable:
     * const additionalMacros = [];
     */
    const additionalMacros = [];
	/**
	 * creaturePacks is a list of compendium packs to look in for Actors by name (in prioritised order).
	 * The first entry here assumes that you have an Actor pack in your module with the "name" of "actors".
	 * Set to the following to disable:
	 *   const creaturePacks = [];
	 */
	const creaturePacks = [`${moduleName}.actors`, 'dnd5e.monsters'];
	/**
	 * journalPacks is a list of compendium packs to look in for Journals by name (in prioritised order).
	 * The first entry here assumes that you have a Journal pack in your module with the "name" of "journals".
	 * Set to the following to disable:
	 *   const journalPacks = [];
	 */
	const journalPacks = [`${moduleName}.journals`];
    /**
     * macroPacks is a list of compendium packs to look in for Macros by name (in prioritised order).
     * The first entry here assumes that you have a Macro pack in your module with the "name" of "macros".
     * Set to the following to disable:
     *   const macroPacks = [];
     */
   const macroPacks = [`${moduleName}.macros`];
    /**
     * playlistPacks is a list of compendium packs to look in for Playlists by name (in prioritised order).
     * The first entry here assumes that you have a Playlist pack in your module with the "name" of "playlists".
     * Set to the following to disable:
     *   const playlistPacks = [];
     */
   const playlistPacks = [`${moduleName}.playlists`];

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//Nothing past this point needs to be changed, in theory at least
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	

	const templatePath = `/modules/${moduleName}/templates`;

	class Settings extends FormApplication {
		static init() {
		game.settings.registerMenu(moduleName, 'menu', {
			name: '',
			label: `${moduleLabel} GM Menu`,
			type: Settings,
			restricted: true
		  });
		}
	
		static get defaultOptions() {
			return {
				...super.defaultOptions,
				template: `${templatePath}/settings.html`,
				height: "auto",
				title: `${moduleLabel} GM Menu`,
				width: 600,
				classes: ["settings"],
				tabs: [ 
					{
						navSelector: '.tabs',
						contentSelector: 'form',
						initial: 'info'
					} 
				],
				submitOnClose: false
			}
		}
	
	
		constructor(object = {}, options) {
			super(object, options);
		}
	
		_getHeaderButtons() {
			return super._getHeaderButtons();
		}
	
	
		getData() {
			return  super.getData();
		}
	
		activateListeners(html) {
			let force_reimport=html.find(".force-reimport");
			let force_update=html.find(".force-update");

			force_reimport.click(()=>{forceReimport();});
			force_update.click(()=>{forceUpdate();});
		}
	
	}

	//Register settings
	Hooks.on("init", () => {
		game.settings.register(moduleName, "imported", {
			scope: "world",
			config: false,
			type: Boolean,
			default: false
		});
		game.settings.register(moduleName, "module-version", {
			scope: "world",
			config: false,
			type: String,
			default: ""
		});
		
		Settings.init();
	})

	//Hook into Token Attacher
	Hooks.once("token-attacher.macroAPILoaded", () => {
		if(!game.user.isGM) return;
		if(ignoreSystem === game.system.id) return;

		if (!game.settings.get(moduleName, "imported") ) {
			Dialog.confirm({
				title: moduleLabel + " Importer",
				content: game.i18n.localize(`${moduleLocalizationScope}.ImportCompendiums`),
				yes: () => StartImport()
			});
		}
		else if(game.settings.get(moduleName, "module-version") !== game.modules.get(moduleName).data.version){
			Dialog.confirm({
				title: moduleLabel + " Updater",
				content: game.i18n.localize(`${moduleLocalizationScope}.UpdateModule`),
				yes: () => StartUpdate()
			});
		}
	});

	/**
	 * Import all compendiums
	 */
	async function StartImport() {
		for (let i = 0; i < compendiumList.length; i++) {
			const json = await fetch(`modules/${moduleName}/${compendiumList[i]}`, {
                headers: {'Content-Type': 'application/json'}
              });
			await tokenAttacher.importFromJSON(await json.text(), {module:moduleName, "module-label":moduleLabel});			
		}
		await game.settings.set(moduleName, "imported", true);
		return game.settings.set(moduleName, "module-version", game.modules.get(moduleName).data.version);
	}

	/**
	 * Delete old compendiums before importing all compendiums
	 */
	async function StartUpdate() {
		for (let i = 0; i < compendiumList.length; i++) {
			const json = await fetch(`modules/${moduleName}/${compendiumList[i]}`, {
                headers: {'Content-Type': 'application/json'}
              });
			const parsed = JSON.parse(await json.text());
			if(parsed.hasOwnProperty("compendium")){
				const pack = await game.packs.get(`world.${moduleName}.${parsed.compendium.name}`);
				if(pack){
					await pack.configure({locked: false});
					await pack.deleteCompendium();
				}
			}
		}
		return StartImport();
	}

	async function forceReimport(){
		await game.settings.set(moduleName, "imported", false);
		await game.settings.set(moduleName, "module-version", game.modules.get(moduleName).data.version - 1);
		return ui.notifications.info("Delete old compendiums and refresh the page with F5!");

	}

	async function forceUpdate(){
		await game.settings.set(moduleName, "module-version", game.modules.get(moduleName).data.version - 1);
		return ui.notifications.info("Refresh the page with F5!");
	}

    Hooks.once('scenePackerReady', ScenePacker => {
        // Initialise the Scene Packer with your adventure name and module name
        let packer = ScenePacker.Initialise({
          adventureName,
          moduleName,
          creaturePacks,
          journalPacks,
          macroPacks,
          playlistPacks,
          welcomeJournal,
          additionalJournals,
          additionalMacros,
          allowImportPrompts: false, // Set to false if you don't want the popup
        });
    });
	Hooks.once("ready", async function () {
		if(game.moulinette) {
		game.moulinette.sources.push({ type: "tiles", publisher: "Baileywiki", pack: "Towns Pack Tiles", source: "data", path: "modules/baileywiki-maps-premium-towns" })
	
  }
});

})();