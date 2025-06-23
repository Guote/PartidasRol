# Path to your Foundry install
# Path to the repo-local data folder (where this script lives)
INSTALL_PATH="/c/FoundryVTT/FoundryVTT-10.303"
REPO_DATA="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/LocalData"
PORT=30010

# Go to Foundry install folder
cd "$INSTALL_PATH"
node resources/app/main.mjs --dataPath="$REPO_DATA" --port=$PORT
