const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFilePath = path.join(__dirname, '../lib/version.ts');
const packageJsonPath = path.join(__dirname, '../package.json');

try {
    // 1. Read current version from package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const appVersion = packageJson.version;

    // 2. Read current build number from lib/version.ts
    let content = fs.readFileSync(versionFilePath, 'utf8');

    // Extract current build number using regex
    const buildMatch = content.match(/export const BUILD_NUMBER = (\d+);/);
    let buildNumber = 1;

    if (buildMatch && buildMatch[1]) {
        buildNumber = parseInt(buildMatch[1], 10) + 1;
    }

    // 3. Generate new content
    const newContent = `// This file is automatically updated by scripts/bump-version.js
export const APP_VERSION = '${appVersion}';
export const BUILD_NUMBER = ${buildNumber};
export const BUILD_DATE = '${new Date().toISOString()}';
`;

    // 4. Write back to file
    fs.writeFileSync(versionFilePath, newContent);
    console.log(`Bumped build number to ${buildNumber}`);

    // 5. Stage the file specifically so it gets included in the commit
    execSync(`git add "${versionFilePath}"`);
    console.log('Staged lib/version.ts');

} catch (error) {
    console.error('Failed to bump version:', error);
    process.exit(1);
}
