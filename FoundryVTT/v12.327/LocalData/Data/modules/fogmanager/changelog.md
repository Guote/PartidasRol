# 1.2.8
 * (Fix) "getHistory is not a function" error
 * (Fix) User names are now more visible against black fog background.

# 1.2.7
 * Fix "User lacks permissions" error (#23)

# 1.2.6
 * (Feature) Disable automatic saving of undo history. 
   * This can be re-enabled in the settings
   * This should reduce the huge scene files that many users had been reporting
   * Closes #20
 * (Fix) some depreciation issues (#22) 

# 1.2.5
 * (Fix) v10 Tool changing not working (#21)

# 1.2.4
 * (Fix) issue with history getting causing scenes.db file sizes to explode. (#20)
   * This should both reduce the future occurrence of it, and cleanup existing scenes.db at load time.
 * (Feature) Add progress bars to broadcast and receive functions

# 1.2.3
 * (Fix) v10 - Hex brush now works in v10
 * (Fix) v10 - Unexplored areas are now visible when editing, the same as in v9
 * (Fix) v10 - Fog flashing on clear was resolved automatically with 10.276  

# 1.2.2
 * (Fix) Hex brush now works in v9
 * (Known issue) v10 - Hex brush not working in v10
 * (Known issue) v10 - Explored area is solid black in editor when not using the new Fog of War Image. You can still see it when mousing over with brushes
 * (Known issue) v10 - Fog flashed clear on apply.  This could reveal hidden things, so avoid using when players are connected.

# 1.2.1
 * (Fix) Now works with PF2E

# 1.2.0
 * (Feature) Support for Foundry V10
 * (Fix) Undoing too far would corrupt data
 * (Fix) Changing scenes didn't always refresh fog properly
 * (Fix) Pushed data to online user would sometimes reset after user moved
 * (Fix) Fog image would drift slightly with repeated push/pulls
 * (Known issue) v10 - Explored area is solid black in editor when not using the new Fog of War Image. You can still see it when mousing over with brushes
 * (Known issue) v10 - Fog flashed clear on apply.  This could reveal hidden things, so avoid using when players are connected.

# 1.1.3
 * Add some transparency to allow you to see the map when FogManager is active.
 
# 1.1.2
 * Fix full clear/full cover button
 
# 1.1.1
 * Fix issue with stale fog returning after update. (Mainly occurs when players are logged in)
 * Fix scaling issue on large (>4096 pixel wide) maps

# 1.1.0
 * Update to support v9! (Not backwards compatible, due to drastic changes in FVTT)
 * Change Reveal/Hide to work like an actual button
 * Fix issue where there was no default tool selected
 * Resolve several edge cases with broadcasting fog

# 1.0.4
 * Remove unneeded .lock file preventing updates

# 1.0.3
 * Re-enable bug-reporter support

# 1.0.2
* Add warning when opening fogmanager if token vision and fog exploration aren't enabled on that scene.

# 1.0.1
* Fixed issue where reanemd users wouldn't update on Config screen
* Fixed issue where pull would fail silently if any user had no fog data (like a new user)

# 1.0.0
* Support for Foundry 0.8.6 

# 0.1.5
* Add support for Bug Reporter

# 0.1.4
* Update for 0.7.9
* Fix minor issue with auto fog sync

# 0.1.3
## New Features
* Add Alpha level support for automatic semi-realtime automatic fog merging.  

# 0.1.2
## New Feature
* Changed icon to differ from Simple Fog

## Fixes
* Fix compatibility with Image Fog. You can again edit fog while seeing the selected Image. Also works better on scenes that don't have an image selected. (Closes #3)
  * Sill a minor issue if Fog Manager is open when changing scenes and using Image Fog. Simply close and re-open Fog Manager to fix it. This will be no-fix until after Image Fog refactors.
* Remove misleading log messages triggered by Simple Fog
* Fix issue with some brushes missing the inital click
* Fix issue with reset Full Cover not covering fully


# 0.1.1
## Fixes 
* Fixes major performance issue on large scenes. (Closes #2)

# 0.1.0
## New Features
* Can now sync to all users, incuding offline
* User Config menu provided to select which users to pull/push from.

## Fixes
* Fixed some issues with erros while changing scenes while Fog Manager is open
* Fixed an issue where user's would lose sight of some tokens after pushing fog changes that overlap them
* Improved the syncing process to be more reliable
* Undo now works
* Only touches GM's fog on explicit Broadcast button push


# 0.0.1
* Initial release
