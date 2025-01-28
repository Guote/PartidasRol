const fs = require('fs');
const path = require('path');

// Path to your JSON file
const jsonFilePath = path.join(__dirname, 'template.json'); // Adjust the filename and path as needed

// Function to recursively extract keys from the JSON
function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], prefix + key + '_'));
    } else {
      let formattedKey = prefix + key;
      // Remove trailing _value and replace periods with underscores
      if (formattedKey.endsWith('_value')) {
        formattedKey = formattedKey.slice(0, -6); // Remove "_value"
      }
      keys.push(formattedKey.replace(/\./g, '_'));
    }
  }
  return keys;
}

// Read the JSON file
fs.readFile(jsonFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading JSON file:', err);
    return;
  }

  try {
    // Parse JSON data
    const jsonData = JSON.parse(data);

    // Extract keys from the "Actor" object
    const actorKeys = getKeys(jsonData.Actor);

    // Convert keys to a CSV format (each key on a new line)
    const csvContent = actorKeys.join('\n');

    // Save the CSV content to a file
    fs.writeFile('FoundryData.csv', csvContent, (err) => {
      if (err) {
        console.error('Error writing to CSV file:', err);
      } else {
        console.log('Keys have been saved to FoundryData.csv');
      }
    });
  } catch (parseError) {
    console.error('Error parsing JSON data:', parseError);
  }
});
