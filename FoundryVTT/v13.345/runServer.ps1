# -------------------------------
# Launch Foundry VTT from repo
# -------------------------------

# Define the path where this version of Foundry is installed, 
# Get the path to the repo-local data folder (where this script lives)
$InstallPath = "C:\FoundryVTT\FoundryVTT-Node-13.345"
$RepoData = Join-Path $PSScriptRoot "LocalData"

# Launch Foundry VTT with the repo-stored data path
Set-Location $InstallPath
node resources/app/main.mjs --dataPath="$RepoData"

# Keep the terminal open after execution
Read-Host "`nPress Enter to close"
