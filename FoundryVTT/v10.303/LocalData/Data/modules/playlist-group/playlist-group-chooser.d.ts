import { AbstractChooser } from './abstract-chooser';
import { SelectModel } from './select-model';
declare class Model {
    name: string;
    playlistIds: string[];
    constructor(name: string, playlistIds: string[]);
}
export declare class PlaylistGroupChooser extends AbstractChooser<Model, {
    playlists: SelectModel[];
    selectedPlaylists: SelectModel[];
}> {
    private callback;
    private selectedPlaylist;
    constructor(object: Model, callback: (name: string, initPlaylistIds: string[]) => void, options?: Partial<FormApplicationOptions>);
    static get defaultOptions(): FormApplicationOptions;
    static selectPlaylists(initName: string, initPlaylistIds: string[], callback: (name: string, initPlaylistIds: string[]) => void): Promise<void>;
    activateListeners(html: JQuery): void;
    protected isValid(data: Model): boolean;
    protected yes(data: Model): void;
    private updateName;
    private updateSelectedPlaylists;
}
export {};
