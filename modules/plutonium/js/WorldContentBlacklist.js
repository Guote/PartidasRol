import {SharedConsts} from "../shared/SharedConsts.js";
import {Util} from "./Util.js";
import {UtilDataSource} from "./UtilDataSource.js";
import {AppSourceSelectorMulti} from "./AppSourceSelectorMulti.js";
import {Vetools} from "./Vetools.js";
import {UtilWorldDataSourceSelector} from "./UtilWorldDataSourceSelector.js";
import {Charactermancer_Race_Util} from "./UtilCharactermancerRace.js";
import {Config} from "./Config.js";
import {UtilWorldContentBlacklist} from "./UtilWorldContentBlacklist.js";

class WorldContentBlacklistSourceSelector extends AppSourceSelectorMulti {
	// region External
	static async pHandleButtonClick () {
		return this._pOpen();
	}

	static async _pOpen () {
		const sources = await this._pGetSources();
		const appSourceSelector = new WorldContentBlacklistSourceSelector({
			title: `World Content Blacklist: Select Sources`,
			filterNamespace: `WorldContentBlacklistSourceSelector_filter`,
			savedSelectionKey: `WorldContentBlacklistSourceSelector_savedSelection`,
			sourcesToDisplay: sources,
		});

		const loadedData = await appSourceSelector.pWaitForUserInput();
		if (loadedData == null) return;

		const mergedData = UtilDataSource.getMergedData(loadedData, {isFilterBlacklisted: false});

		const instanceCharactermancer = new WorldContentBlacklist({
			data: mergedData,
		});
		instanceCharactermancer.render(true);
	}
	// endregion

	static async _pGetSources () {
		return [
			new UtilDataSource.DataSourceSpecial(
				Config.get("ui", "isStreamerMode") ? "SRD" : "5etools",
				() => BlacklistUtil.pLoadData(),
				{
					cacheKey: "5etools-blacklist",
					filterTypes: [UtilDataSource.SOURCE_TYP_OFFICIAL_ALL],
					isDefault: true,
					pPostLoad: this._pPostLoad.bind(this, {isVetools: true}),
				},
			),
			new UtilDataSource.DataSourceUrl(
				"Custom URL",
				"",
				{
					pPostLoad: this._pPostLoad.bind(this, {isVetools: false}),
					filterTypes: [UtilDataSource.SOURCE_TYP_CUSTOM],
				},
			),
			new UtilDataSource.DataSourceFile(
				"Upload File",
				{
					pPostLoad: this._pPostLoad.bind(this, {isVetools: false}),
					filterTypes: [UtilDataSource.SOURCE_TYP_CUSTOM],
				},
			),
			...(await Vetools.pGetLocalHomebrewSources(...WorldContentBlacklistSourceSelector._BREW_DIRS)).map(({name, url}) => new UtilDataSource.DataSourceUrl(
				name,
				url,
				{
					pPostLoad: this._pPostLoad.bind(this, {isVetools: false}),
					filterTypes: [UtilDataSource.SOURCE_TYP_BREW, UtilDataSource.SOURCE_TYP_BREW_LOCAL],
				},
			)),
			...(await Vetools.pGetHomebrewSources(...WorldContentBlacklistSourceSelector._BREW_DIRS)).map(({name, url}) => new UtilDataSource.DataSourceUrl(
				name,
				url,
				{
					pPostLoad: this._pPostLoad.bind(this, {isVetools: false}),
					filterTypes: [UtilDataSource.SOURCE_TYP_BREW],
				},
			)),
		].filter(dataSource => !UtilWorldDataSourceSelector.isFiltered(dataSource));
	}

	static async _pPostLoad ({isVetools}, out) {
		out = {...out};

		if (!isVetools && (out.race || out.subrace)) {
			out.race = MiscUtil.copy(out.race || []);
			out.race = await Charactermancer_Race_Util.pPostLoadBrew(out);
		}

		return out;
	}
}
WorldContentBlacklistSourceSelector._BREW_DIRS = [
	"action",
	"adventure",
	"background",
	"book",
	"boon",
	"charoption",
	"class",
	"condition",
	"creature",
	"cult",
	"deity",
	"disease",
	"feat",
	"hazard",
	"item",
	"magicvariant",
	"object",
	"optionalfeature",
	"psionic",
	"race",
	"recipe",
	"reward",
	"spell",
	"subclass",
	"subrace",
	"trap",
	"variantrule",
	"vehicle",
	"classFeature",
	"subclassFeature",
];

class BlacklistUiFvtt extends BlacklistUi {
	_export () {
		DataUtil.userDownload(
			`content-blacklist`,
			{
				blacklist: ExcludeUtil.getList(),
			},
			{
				fileType: "content-blacklist",
				propVersion: "moduleVersion",
				valVersion: game.modules.get(SharedConsts.MODULE_NAME).data.version,
			},
		);
	}

	async _pImport_getUserUpload () {
		return DataUtil.pUserUpload({
			expectedFileTypes: ["content-blacklist"],
			propVersion: "moduleVersion",
		});
	}

	_addListItem_getItemStyles () { return `no-click ve-flex-v-center veapp__list-row-hoverable`; }

	async pSave () {
		await UtilWorldContentBlacklist.pSaveState(MiscUtil.copy(this._excludes));
	}
}

/**
 * A port of the 5etools "Blacklist" page.
 */
class WorldContentBlacklist extends Application {
	static APP_TITLE = "World Content Blacklist";

	constructor ({data}) {
		super(
			{
				title: WorldContentBlacklist.APP_TITLE,
				template: `${SharedConsts.MODULE_LOCATION}/template/WorldContentBlacklist.hbs`,
				width: 960,
				height: Util.getMaxWindowHeight(),
				resizable: true,
			},
		);
		this._data = data;

		this._ui = null;
	}

	activateListeners ($html) {
		super.activateListeners($html);

		this._pRender($html).then(null);
	}

	async _pRender ($html) {
		const $stgMid = $html.find(`[data-name="wrp-mid"]`);
		const $stgBot = $html.find(`[data-name="wrp-bot"]`);

		await this._pRender_pMid({$stgMid});
		this._pRender_bot({$stgBot});
	}

	async _pRender_pMid ({$stgMid}) {
		this._ui = new BlacklistUiFvtt({
			$wrpContent: $stgMid,
			data: this._data,
			isCompactUi: true,
			isAutoSave: false,
		});
		await this._ui.pInit();
	}

	_pRender_bot ({$stgBot}) {
		const $btnSave = $(`<button class="btn btn-5et btn-default w-100">Save</button>`)
			.click(async () => {
				await this._ui.pSave();
			});

		$$($stgBot.empty())`<div class="ve-flex-v-center">
			${$btnSave}
		</div>`;
	}
}

export {WorldContentBlacklistSourceSelector, WorldContentBlacklist};
