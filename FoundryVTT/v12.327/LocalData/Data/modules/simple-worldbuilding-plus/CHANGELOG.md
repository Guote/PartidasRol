# 1.2.0

![Foundry v11.315](https://img.shields.io/badge/Foundry-v11.315-green) ![Foundry v12](https://img.shields.io/badge/Foundry-v12-yellow)

- Updated character sheets to support using `[[rollFormula]]` for displaying rolls rather than `{{rollFormula}}`. There's currently a fallback that will convert the `{{}}` format to `[[]]`, but that will eventually be removed in a future version along with a one-time migration.
- Implemented a fix for item roll buttons not working in Simple Worldbuilding. See https://github.com/foundryvtt/worldbuilding/issues/63 for reference.
- Removed usage of async rolls to better prepare for Foundry v12.