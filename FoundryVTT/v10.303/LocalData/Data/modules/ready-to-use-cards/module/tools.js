import { GlobalConfiguration } from "./constants.js";
import { CARD_STACKS_DEFINITION } from "./StackDefinition.js";

export const cardStackSettings = () => {
	let chosenStacks = game.settings.get('ready-to-use-cards', GlobalConfiguration.stacks);
	if( !chosenStacks || chosenStacks == '' ) { chosenStacks = {}; }
	return chosenStacks;
}

export const updateCardStackSettings = async (newSettings) => {
	const result = await game.settings.set('ready-to-use-cards', GlobalConfiguration.stacks, newSettings ?? {} );
	return result;
}


export const allBacksSettings = () => {
	let allBacks = game.settings.get('ready-to-use-cards', GlobalConfiguration.backs);
	if( !allBacks || allBacks == '' ) { allBacks = {}; }
	return allBacks;
}

export const deckBacksSettings = (coreStackRef) => {
	let allBacks = allBacksSettings();
	
	let backs = allBacks[coreStackRef];
	if( !backs ) {
		backs = {};

		const module = game.modules.get('ready-to-use-cards');
		const deck = module.cardStacks.decks[coreStackRef]
		const discard = module.cardStacks.piles[coreStackRef]
		backs.deckIcon = deck.stack.img;
		backs.discardIcon = discard.stack.img;

		const baseDir = CARD_STACKS_DEFINITION.core[coreStackRef].resourceBaseDir;
		backs.deckBg = baseDir + '/background/back.webp';
		backs.discardBg = baseDir + '/background/front.webp';
	}

	return backs;
}

export const updateDeckBacksSettings = async (coreStackRef, newSettings) => {
	const allBacks = allBacksSettings();
	if( newSettings ) {
		allBacks[coreStackRef] = newSettings;
	} else {
		delete allBacks[coreStackRef];
	}

	const result = await game.settings.set('ready-to-use-cards', GlobalConfiguration.backs, allBacks );
	return result[coreStackRef];
}
