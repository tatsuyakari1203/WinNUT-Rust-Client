import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: bun run release <version>');
  console.error('Example: bun run release 0.1.2');
  process.exit(1);
}

// Validation
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Invalid version format. Use x.y.z');
  process.exit(1);
}

const root = process.cwd();
const tauriConfigPath = resolve(root, 'src-tauri/tauri.conf.json');
const packageJsonPath = resolve(root, 'package.json');

console.log(`🚀 Preparing release v${newVersion}...`);

// 1. Update tauri.conf.json
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'));
tauriConfig.version = newVersion;
writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));
console.log('✅ Updated tauri.conf.json');

// 2. Update package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json');

// 3. Git Commit and Tag
try {
  console.log('📦 Committing and Tagging...');
  execSync('git add src-tauri/tauri.conf.json package.json');
  execSync(`git commit -m "chore: release v${newVersion}"`);
  execSync(`git tag v${newVersion}`);

  console.log('⬆️  Pushing to GitHub...');
  execSync('git push');
  execSync(`git push origin v${newVersion}`);

  console.log(`\n✨ Release v${newVersion} triggered! GitHub Actions will now build and publish.`);
} catch (error) {
  console.error('❌ Git operations failed:', error);
  process.exit(1);
}
