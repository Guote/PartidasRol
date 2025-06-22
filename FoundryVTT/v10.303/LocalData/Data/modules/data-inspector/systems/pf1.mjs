// Example filters

/**
 * Supplement temporary document data creation.
 *
 * @param {Actor|Item} doc Original document.
 * @param {object} data Data used to create temporary document.
 */
function supplementTemporaryData(doc, data) {
	const docData = doc.system;

	data.system.subType = doc.system.subType;

	if (doc instanceof Actor) {
		switch (doc.type) {
			case 'character':
				break;
			case 'npc':
				break;
		}
	}
	else if (doc instanceof Item) {
		// Add item subtype based on item being compared to.
		data.system.subType = docData.subType;
		switch (doc.type) {
			case 'weapon':
				data.system.weaponSubtype = docData.weaponSubtype;
				break;
			case 'spell':
				data.system.spellbook = docData.spellbook;
				break;
			case 'equipment':
				data.system.equipmentSubtype = docData.equipmentSubtype;
				break;
		}
	}
}

/**
 * @param {Document} doc
 * @param {string} path
 * @param {"rolldata"|"source"|"derived"} mode
 */
function filterData(doc, path, mode) {
	if (game.user.isGM) return;

	if (mode === 'rolldata') return;

	const docData = doc.system;

	if (doc instanceof Item) {
		const isIdentified = docData.identified === true;

		switch (doc.type) {
			case 'weapon':
			case 'equipment':
			case 'consumable':
			case 'loot':
			case 'container': {
				// Omit data that may be secret
				const idPaths = [
					'system.identified',
					'system.identifiedName',
					'system.unidentifiedName',
					'system.description.unidentified',
					'system.description.value',
					'system.unidentified.name',
					'system.unidentified.price',
				];
				if (!isIdentified && idPaths.includes(path))
					return false;
				break;
			}
		}
	}
}

Hooks.on('data-inspector.temporaryData', supplementTemporaryData);
Hooks.on('data-inspector.filterData', filterData);
