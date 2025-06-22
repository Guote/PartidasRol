# FoundryVTT Version Manager (LocalData Sync)

This repository is used to manage **multiple Foundry VTT versions** by storing their `LocalData` folders in Git.

## 💡 Concept

Each Foundry version is stored in its own folder in the repo:

```
FoundryVTT/
├── v10.303/
│   └── LocalData/
├── v12.327/
│   └── LocalData/
├── v13.345/
│   └── LocalData/
```

These contain only the `LocalData` directory — no binaries.

---

## 🖥️ On Your Local Machine

Outside of Git, you maintain a parallel folder structure to run each Foundry version:

```
C:/FoundryVTT/v12.327/
├── FoundryVTT/       → Node installation for that version
├── LocalData/        → 🔗 Symlink to the corresponding repo folder
├── runServer.ps1     → Script to launch this Foundry version
```

You can clone this repo anywhere and create symlinks like:

```powershell
New-Item -ItemType SymbolicLink `
         -Path "C:\FoundryVTT\v12.327\LocalData" `
         -Target "C:\Path\To\This\Repo\FoundryVTT\v12.327\LocalData"
```

---

## 🔧 Requirements

- Git installed
- PowerShell for symlink creation
- Developer Mode enabled on Windows (for symlinks without admin)
