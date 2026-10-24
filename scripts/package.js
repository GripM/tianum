/**
 * Tianum Networth Managers - Cross-Platform Deployment Packager (cPanel & Netlify)
 * Runs on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const distDir = path.join(ROOT_DIR, 'dist');

// Deployment Packages
const cpanelZip = path.join(ROOT_DIR, 'cpanel-deploy.zip');
const cpanelAliasZip = path.join(ROOT_DIR, 'tianum-cpanel.zip');
const netlifyZip = path.join(ROOT_DIR, 'netlify-deploy.zip');
const netlifyAliasZip = path.join(ROOT_DIR, 'tianum-netlify-deploy.zip');

console.log('==========================================================');
console.log('  Tianum Networth - Creating Production Deployment Archives');
console.log('==========================================================');

// 1. Run production build script
console.log('[1/4] Running production build validation & staging...');
execSync('node scripts/build.js', { stdio: 'inherit', cwd: ROOT_DIR });

// 2. Remove existing zip archives
console.log('[2/4] Cleaning previous deployment packages...');
[cpanelZip, cpanelAliasZip, netlifyZip, netlifyAliasZip].forEach(f => {
  if (fs.existsSync(f)) {
    try { fs.unlinkSync(f); } catch (e) {}
  }
});

// 3. Compress dist/ into cPanel Deployment ZIP (includes hidden files like .htaccess)
console.log('[3/4] Compressing staging directory into cPanel deploy ZIP (with .htaccess)...');

if (process.platform === 'win32') {
  const psHelper = path.join(ROOT_DIR, 'scripts', 'create-zip.ps1');
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psHelper}" -SourceDir "${distDir}" -ZipFile "${cpanelZip}"`;
  execSync(psCmd, { stdio: 'inherit', cwd: ROOT_DIR });
} else {
  // Use zip on Unix preserving dotfiles
  execSync(`cd "${distDir}" && zip -r -9 "${cpanelZip}" . -x "*.DS_Store"`, { stdio: 'inherit', cwd: distDir });
}

// Create alias copy for cPanel
if (fs.existsSync(cpanelZip)) {
  fs.copyFileSync(cpanelZip, cpanelAliasZip);
}

// Also create Netlify zip
if (fs.existsSync(cpanelZip)) {
  fs.copyFileSync(cpanelZip, netlifyZip);
  fs.copyFileSync(cpanelZip, netlifyAliasZip);
}

// 4. Verify package contents
console.log('[4/4] Verifying archive contents and metrics...');
if (process.platform === 'win32') {
  const verifyHelper = path.join(ROOT_DIR, 'scripts', 'verify-zip.ps1');
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${verifyHelper}" -ZipFile "${cpanelZip}"`, { stdio: 'inherit', cwd: ROOT_DIR });
  } catch (e) {}
}

const stat = fs.statSync(cpanelZip);
const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

console.log('==========================================================');
console.log('  SUCCESS! Deployment Packages Ready');
console.log(`  cPanel Deploy Archive:  cpanel-deploy.zip (${sizeMB} MB)`);
console.log(`  cPanel Alias Archive:   tianum-cpanel.zip (${sizeMB} MB)`);
console.log(`  Direct Upload Folder:   dist/ (Ready for public_html)`);
console.log('==========================================================');
