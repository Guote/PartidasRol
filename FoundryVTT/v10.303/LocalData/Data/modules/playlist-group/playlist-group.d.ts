import { DocumentData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs';
export declare class PlaylistGroup {
    static createPlaylistGroup(): Promise<void>;
    static updatePlaylistGroupFromSound(sound: PlaylistSound): Promise<void>;
    static updatePlaylistGroupSounds(playlistGroup: Playlist | StoredDocument<Playlist>): Promise<void>;
    static toRecords<E, F extends object>(arrays: (DocumentData<E, F> & any)[]): Record<string, unknown>[];
}
