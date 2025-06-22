import { DeckParameters, StackActionTypes, StackTargetPossibilities } from "../constants.js";
import { cardStackSettings } from "../tools.js";

/**
 * Go through all declared and default stack, even if they haven't been chosen
 * Extract all necessay metadata from them to be able to create this.object.stacks
 * @returns {object[]} Necessay metadata for all stacks
 */
const computeAllPossibleStackList = () => {

	const module =game.modules.get('ready-to-use-cards');
	const cardStacks = module.cardStacks;
	const actualDefinition = module.stacksDefinition;
	const parameterService = module.parameterService;

	const registeredSuffix = game.i18n.localize('RTUCards.coreStacks.suffix.manuallyRegistered');
	const viaHooksSuffix = game.i18n.localize('RTUCards.coreStacks.suffix.viaCode');;

	const list = Object.entries(cardStacks.defaultCoreStacks).map( ([key, stackDef]) => {

		const deckInSettings = cardStackSettings()[key];
		const labelBaseKey = parameterService.getCoreParam(key, DeckParameters.labelBaseKey) ?? stackDef.labelBaseKey;
		const revealedFaceDown = parameterService.getCoreParam(key, DeckParameters.revealedFaceDown) ?? false;

		const deckName = stackDef.customName ?? game.i18n.localize(labelBaseKey + 'title');
		const deckDesc = stackDef.customDesc ?? game.i18n.localize(labelBaseKey + 'description');

		// FIXME : isManuallyRegistered and customName should be moved inside flags
		return {
			key: key,
			default: true,
			useCustomCardImpl: false,
			labelBaseKey: labelBaseKey,
			revealedFaceDown: revealedFaceDown,
			toggled: !!deckInSettings,
			toggleLocked: stackDef.isManuallyRegistered ?? false,
			deck : {
				name: deckName + (stackDef.isManuallyRegistered ? registeredSuffix : '' ),
				desc: deckDesc
			}
		};
	});

	const addedViaHooks = Object.entries(actualDefinition.core).filter( ([key, coreDef]) => {
		return !list.find(s => s.key === key) 

	}).map(([key, coreDef]) => {

		// The ones in actualDefinition always have settings for them
		const labelBaseKey = parameterService.getCoreParam(key, DeckParameters.labelBaseKey);
		const overrideConf = parameterService.getCoreParam(key, DeckParameters.overrideConf);
		const revealedFaceDown = parameterService.getCoreParam(key, DeckParameters.revealedFaceDown) ?? false;

		return {
			key: key,
			default: false,
			useCustomCardImpl: coreDef.cardClass != actualDefinition.shared.cardClasses.simple,
			labelBaseKey: labelBaseKey,
			overrideConf: overrideConf,
			revealedFaceDown: revealedFaceDown,
			toggled: true,
			toggleLocked: true,
			deck : {
				name: game.i18n.localize(labelBaseKey + 'title') + viaHooksSuffix,
				desc: game.i18n.localize(labelBaseKey + 'description')
			}
		};
	});
	list.push( ...addedViaHooks);
	return list;
}

/**
 * Augment stack.groups by adding CSS info
 * @param {object} stack As defined in this.object.stacks
 * @returns {object[]} groupsGui, grouped by actionType
 */
const actionGroupsForGUI = (stack) => {

	// Convenience functions
	//-------------------------
	const computeDisplayedOptions = (groupDef) => {
		const noTarget = groupDef.grid.css == 'no-target';

		let allOptions;
		if( noTarget ) {
			allOptions= groupDef.grid.targets.map( t => {
				return {from: t, target: t};
			});
		} else {
			allOptions = [];
			Object.values(StackTargetPossibilities).forEach( from => {
				Object.values(groupDef.grid.targets).forEach( target => {
					allOptions.push({from: from, target: target});
				});
			});

		}
		return allOptions;
	}

	const computeDisplayedGridLines = (groupDef) => {
		const noTarget = groupDef.grid.css == 'no-target';
		const alone = groupDef.grid.css == 'alone';
		return {
			alone: alone,
			noTarget: noTarget,
			deck : !noTarget && groupDef.grid.targets.includes('DE'),
			discard : !noTarget && groupDef.grid.targets.includes('DI'),
			gm : !noTarget && groupDef.grid.targets.includes('GH'),
			players : !noTarget && groupDef.grid.targets.includes('PH'),
		};
	}

	const computeDisplayedActionParameters = (groupDef) => {
		
		// One section for each distinct action. Start with labels
		const actionParams = groupDef.labels.filter( l => {
			// Action which have not been selected won't be displayed
			return groupDef.actions.some( a => a.action === l.action && a.available);

		}).map( l => {
			return {
				action: l.action,
				label: {
					default: l.default,
					current: l.default != l.current ? l.current : ""
				}
			};
		});
		actionParams.sort( (a,b) => a.label.default.localeCompare(b.label.default) );

		// Add related parameters
		actionParams.forEach( a => {
			a.parameters = groupDef.parameters.filter( p => {
				return p.action === a.action;
			}).map( p => {
				return {
					id: p.id, // Unique id for datalists
					param: p.param,
					label: p.label,
					default: p.default,
					current: p.default != p.current ? p.current : "",
					validation: p.validation,
					checkbox: {
						displayed: p.validation.pattern == "[0-1]",
						default: p.current == p.default,
						checked: p.current == "1"
					}
				};
			});
		});

		return actionParams;
	}

	const computeDisplayedGuiTabs = (groupDef, gridLines, actionParameters) => {
		
		// Build tab list
		const guiTabs = { list: [] };
		if( !gridLines.alone ) {
			guiTabs.list.push({ id: "grid", header: game.i18n.localize("RTUCards.settings.config-actions.actionGrid.header") });
		}
		if( actionParameters.length > 0 ) {
			guiTabs.list.push({ id: "params", header: game.i18n.localize("RTUCards.settings.config-actions.actionParams.header") });
		}
		
		// Add radio button selection
		guiTabs.displayed = guiTabs.list.length > 0;
		if( guiTabs.displayed ) {

			// /!\ May update groupDef.currentTab
			if( ! guiTabs.list.some( t => t.id === groupDef.currentTab ) ) {
				groupDef.currentTab = guiTabs.list[0].id;
			}
			
			guiTabs.list.forEach( t => {
				t.selected = ( t.id === groupDef.currentTab );
			});
		}
		guiTabs.gridDisplayed = guiTabs.list.find( t => t.id === "grid" )?.selected ?? false;
		guiTabs.paramDisplayed = guiTabs.list.find( t => t.id === "params" )?.selected ?? false;
		return guiTabs;
	}

	const mapStackActionForGui = (option, groupDef) => {
		const from = option.from;
		const target = option.target;

		const item = {
			area: from + target,
			classes : 'toggle-button',
			active: false
		};

		const declaredAction = groupDef.actions.find( a => a.from === from && a.target === target );
		if(declaredAction) {
			item.active = !locked;
			item.classes += declaredAction.available ? ' far fa-check-square' : ' far fa-square';
			foundry.utils.mergeObject(item, declaredAction);

		} else {
			item.classes += ' fas fa-ban';
		}

		item.classes += item.active ? ' active' : '';

		return item;
	}

	// Prepare groups so that they can be used inside hbs
	//------------------------
	const lockKey = DeckParameters.overrideConf;
	const locked = stack.parameters.hasOwnProperty(lockKey) && !stack.parameters[lockKey];

	// Prepare all groups
	const allGuiGroups = Object.entries(stack.groups).map( ([groupId, groupDef]) => {

		const groupGui = {
			topLevel: groupDef.actionType,
			stackId: stack.key,
			groupId: groupId,
			name: groupDef.name,
			description: groupDef.description,
			unfolded: groupDef.unfolded,
			grid: {
				css: groupDef.grid.css,
				from: game.i18n.localize( groupDef.grid.fromLabel ?? 'RTUCards.settings.config-actions.actionGrid.from' ),
				target: game.i18n.localize( groupDef.grid.targetLabel ?? 'RTUCards.settings.config-actions.actionGrid.targets' ),
				lines: computeDisplayedGridLines(groupDef)
			}, 
			toggle: {
			}
		};

		// Add data used by toggle icons
		// used and fullyUsed were re
        const used = groupDef.actions.some( a => a.available );
        const fullyUsed = used && !groupDef.actions.some( a => !a.available );
		groupGui.toggle.checkCss = used ? ( fullyUsed ? 'far fa-check-square' : 'far fa-minus-square' ) : 'far fa-square';
		groupGui.toggle.foldCss = groupDef.unfolded ? 'far fa-folder-open' : 'far fa-folder';

		groupGui.toggle.checkCss += locked ? '' : ' active';
		groupGui.toggle.foldCss += ' active'; // Can still navigate

		// Action list displays chosen ones, as well as invalid or not chosen
		groupGui.actions = computeDisplayedOptions(groupDef).map( option => {
			return mapStackActionForGui(option, groupDef);
		});

		// Parameters for each action
		groupGui.actionParameters = computeDisplayedActionParameters(groupDef);
		
		// Check if there is a need to update currentTab
		groupGui.guiTabs = computeDisplayedGuiTabs(groupDef, groupGui.grid.lines, groupGui.actionParameters);

		return groupGui;
	});

	// Gui groups are grouped by actionTypes 
	const topLevelGroups = Object.entries(StackActionTypes).map( ([key, value]) => {
		return {
			header: game.i18n.localize(value.labelKey),
			list: allGuiGroups.filter( g => g.topLevel === key )
		};
	})
	return topLevelGroups;
}

const buildStackCoreParams = (stack) => {

	const coreParams = [];

	// Convenience functions
	//--------------------------
	const pushLine = ({icon='', clickable=true, labelKey='', param='', editText=null} = {}) => {
		const line = {};
		line.classes = icon;
		if( clickable ) { line.classes += ' active'; }
	
		line.label = game.i18n.localize(labelKey);
		line.param = param;
	
		line.input = {
			displayed: (editText != null),
			text: editText
		};
	
		coreParams.push(line);
	};

	const pushStringParamLine = ({icon="", param=""} = {}) => {
		pushLine({
			icon: icon, 
			param: param, 
			clickable: false, 
			labelKey: 'RTUCards.settings.config-actions.additionalData.' + param, 
			editText: stack.parameters[param]
		});
	};

	const pushBooleanParamLine = ({okIcon="", koIcon="", param=""} = {}) => {
		const val = stack.parameters[param];
		pushLine({
			icon: val ? okIcon : koIcon, 
			param: param, 
			clickable: true, 
			labelKey: 'RTUCards.settings.config-actions.additionalData.' + param
		});
	};
	

	// Deck desc
	const desc = stack.gui.deck.desc;
	if( desc && desc != '' ) {
		pushLine({ icon: 'fas fa-info', clickable: false, labelKey: stack.gui.deck.desc });
	}

	if( stack.useCustomCardImpl ) {
		pushLine({ icon: 'fas fa-exclamation', clickable: false, labelKey: 'RTUCards.settings.config-actions.additionalData.warnImplem' })
	}
	
	// Core parameters
	pushStringParamLine({icon: 'far fa-edit', param: DeckParameters.labelBaseKey});
	pushBooleanParamLine({okIcon: 'far fa-check-square', koIcon: 'far fa-square', param: DeckParameters.revealedFaceDown});

	// For stack generated by code : See if the user can override conf values
	if( stack.parameters.hasOwnProperty(DeckParameters.overrideConf) ) {
		pushBooleanParamLine({okIcon: 'fas fa-lock-open', koIcon: 'fas fa-lock', param: DeckParameters.overrideConf});
	}

	return coreParams;
}

/**
 * A configuration sheet to configure available actions for each declared deck
 * @extends {FormApplication}
 */
export class ConfigSheetForActions extends FormApplication {


	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "rtucards-config-actions",
			classes: ["rtucards-config-actions"],
			template: "modules/ready-to-use-cards/resources/config-actions.hbs",
			width: 600,
			height: "auto",
			closeOnSubmit: false,
            scrollY: [".deck-list"]
		});
	}

	/* -------------------------------------------- */

	/** @override */
	get title() {
		return game.i18n.localize("RTUCards.settings.config-actions.menu");
	}

	/* -------------------------------------------- */

	constructor(object={}, options={}) {
		super(object, options);
		this.module = game.modules.get('ready-to-use-cards');
		this.initStacks();
	}

	initStacks( ) {

		// Create this.object.stacks
		this.object.stacks = computeAllPossibleStackList().map( s => {

			const data = {};
			data.key = s.key;
			data.isDefaultStack = s.default;
			data.useCustomCardImpl = s.useCustomCardImpl;
			data.gui = {
				toggled: s.toggled,
				toggleLocked: s.toggleLocked,
				detailsDisplayed: false,
				deck: s.deck
			};

			// actionGroups : actions are grouped by category. (Move, Exchance, Deal, Rotate, ...)
			//---------------
			data.groups = this.module.actionService.getAllActionsDetailsMap(s.key);
			Object.values(data.groups).forEach( g => {
				g.unfolded = false;
				g.currentTab = null; // Once unfolded, tab will be deduced
				return g;
			});

			// parameters : Additional info on deck, like image path or translation prefix
			//---------------
			data.parameters = {
				labelBaseKey: s.labelBaseKey,
				revealedFaceDown: s.revealedFaceDown
			};
			if( s.hasOwnProperty('overrideConf')) { 
				data.parameters.overrideConf = s.overrideConf;
			}

			return data;
		});
	}
	
	_prepareStackList() {

		// Add confboxes information for each stack
		const stacks = this.object.stacks.map( stack => {
			const data = {
				coreParams: buildStackCoreParams(stack),
				groupsGui: actionGroupsForGUI(stack)
			};

			return foundry.utils.mergeObject( data, stack );
		});
		return stacks;
	}

	/** @override */
	async getData() {

		const stacks = this._prepareStackList();

		return {
			stacks: stacks
		};
	}

	/** @override */
    activateListeners(html) {
		html.find('.declared-deck .toggle-button.deck.active').click(event => this._onClickToggleDeck(event) );
		html.find('.declared-deck .toggle-button.show.active').click(event => this._onClickToggleDetails(event) );
		
		html.find('.details.action-group .group-action.toggle-button.active').click(event => this._onClickToggleActionChoice(event) );
		html.find('.details.action-group .group-check.toggle-button.active').click(event => this._onClickToggleWholeActionGroup(event) );
		html.find('.details.action-group .group-fold.toggle-button.active').click(event => this._onClickFoldActionGroup(event) );
		html.find('.details.action-group .group-tab').click(event => this._onClickChangeActionGroupTab(event) );

        html.find('.details.action-group .param-input.button-text').change(event => this._onChangeActionButtonText(event) );
        html.find('.details.action-group .param-input.real-param').change(event => this._onChangeActionParameter(event) );
        html.find('.details.action-group .param-boolean-input').click(event => this._onChangeActionBooleanParameter(event) );

		html.find('.details.core-params .toggle-button.active').click(event => this._onClickToggleCoreParameter(event) );
        html.find('.details.core-params .param-input').change(event => this._onClickEditCoreParameter(event) );

		html.find('.save-stacks').click(event => this._onClickSaveConfig(event) );
	}

	/** @override */
	_updateObject(event, formData) {
		// Not used
	}

	/* -------------------------------------------- */

	async _onClickToggleActionChoice(event) {
		const checkboxInGrid = event.currentTarget;
		const groupDiv = checkboxInGrid.parentElement.parentElement.parentElement;

		const configKey = checkboxInGrid.dataset.config;
		const deckKey = groupDiv.dataset.key;
		const groupId = groupDiv.dataset.group;

		const stack = this.object.stacks.find( s => s.key === deckKey);
		const group = stack.groups[groupId];
		const action = group.actions.find( a => a.confKey === configKey);

		action.available = !action.available;
		this.render();
	}

	async _onClickToggleWholeActionGroup(event) {
		const checkboxIcon = event.currentTarget;
		const groupDiv = checkboxIcon.parentElement.parentElement;

		const deckKey = groupDiv.dataset.key;
		const groupId = groupDiv.dataset.group;

		const stack = this.object.stacks.find( s => s.key === deckKey);
		const group = stack.groups[groupId];
		const used = group.actions.some( a => a.available );
		group.unfolded = !used;
		group.actions.forEach( a => {
			a.available = !used;
		});
		
		this.render();
	}

	async _onClickFoldActionGroup(event) {
		const folderIcon = event.currentTarget;
		const groupDiv = folderIcon.parentElement.parentElement;

		const deckKey = groupDiv.dataset.key;
		const groupId = groupDiv.dataset.group;

		const stack = this.object.stacks.find( s => s.key === deckKey);
		const group = stack.groups[groupId];
		group.unfolded = !group.unfolded;
		this.render();
	}

	async _onClickChangeActionGroupTab(event) {
		const tabDiv = event.currentTarget;
		const groupDiv = tabDiv.parentElement.parentElement;

		const tab = tabDiv.dataset.tab;
		const deckKey = groupDiv.dataset.key;
		const groupId = groupDiv.dataset.group;

		const stack = this.object.stacks.find( s => s.key === deckKey);
		const group = stack.groups[groupId];
		group.currentTab = tab;
		this.render();		
	}

	async _onChangeActionButtonText(event) {
		const input = event.currentTarget;
		const paramDiv = input.parentElement.parentElement; 
		const groupDiv = paramDiv.parentElement;

		const action = paramDiv.dataset.action;
		const deckKey = groupDiv.dataset.key;
		const groupId = groupDiv.dataset.group;

		const stack = this.object.stacks.find( s => s.key === deckKey);
		const group = stack.groups[groupId];
		const label = group.labels.find(l => l.action === action);
		label.current = input.value;
		this.render();
	}

	async _onChangeActionParameter(event) {

		const input = event.currentTarget;
		if( input.validity.valid ) {
			const paramDiv = input.parentElement.parentElement; 
			const groupDiv = paramDiv.parentElement;
	
			const paramKey = input.dataset.param;
			const action = paramDiv.dataset.action;
			const deckKey = groupDiv.dataset.key;
			const groupId = groupDiv.dataset.group;
	
			const stack = this.object.stacks.find( s => s.key === deckKey);
			const group = stack.groups[groupId];
			const param = group.parameters.find(p => p.action === action && p.param === paramKey);
			param.current = input.value;
		}
		this.render();
	}

	async _onChangeActionBooleanParameter(event) {

		const checkbox = event.currentTarget;
		const paramDiv = checkbox.parentElement.parentElement; 
		const groupDiv = paramDiv.parentElement;

		const paramKey = checkbox.dataset.param;
		const action = paramDiv.dataset.action;
		const deckKey = groupDiv.dataset.key;
		const groupId = groupDiv.dataset.group;

		const stack = this.object.stacks.find( s => s.key === deckKey);
		const group = stack.groups[groupId];
		const param = group.parameters.find(p => p.action === action && p.param === paramKey);
		param.current = param.current == "1" ? "0" : "1";
		this.render();
	}


	async _onClickSaveConfig(event) {

		const wholeDetails = this.object.stacks.filter( s => {
			return s.gui.toggled;

		}).map( s => {
			return { key: s.key, 
					 coreParameters: s.parameters,
					 details: s.groups };
		});

		await this.module.actionService.updateSettingsWithCurrentActionDetails(wholeDetails);
		await this.module.cardStacks.loadCardStacks();
		this.close();
	}

	async _onClickToggleDeck(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const key = a.parentElement.parentElement.dataset.key;

		const stack = this.object.stacks.find( s =>s.key === key );
		const wasToggled = stack.gui.toggled;
		stack.gui.toggled = !wasToggled;
		stack.gui.detailsDisplayed = !wasToggled;
		this.render();
	}

	async _onClickToggleDetails(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const key = a.parentElement.parentElement.dataset.key;

		const stack = this.object.stacks.find( s =>s.key === key );
		stack.gui.detailsDisplayed = !stack.gui.detailsDisplayed;
		this.render();
	}

	async _onClickToggleCoreParameter(event) {
		event.preventDefault();
		const toggle = event.currentTarget;
		const paramLine = toggle.parentElement;
		const deckDiv = paramLine.parentElement.parentElement;

		const paramKey = paramLine.dataset.param;
		const deckKey = deckDiv.dataset.key;

		const stack = this.object.stacks.find( s =>s.key === deckKey );
		stack.parameters[paramKey] = !stack.parameters[paramKey];
		this.render();
	}

	async _onClickEditCoreParameter(event) {
		event.preventDefault();
		const input = event.currentTarget;
		const paramLine = input.parentElement;
		const deckDiv = paramLine.parentElement.parentElement;

		const paramKey = paramLine.dataset.param;
		const deckKey = deckDiv.dataset.key;

		const stack = this.object.stacks.find( s =>s.key === deckKey );
		stack.parameters[paramKey] = input.value;
		this.render();
	}

}

