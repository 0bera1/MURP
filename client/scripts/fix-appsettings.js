const fs = require('fs');
const path = require('path');

const appSettingsPath = path.join(__dirname, '../dist/models/AppSettings.js');

if (fs.existsSync(appSettingsPath)) {
  let content = fs.readFileSync(appSettingsPath, 'utf8');
  
  // ES Module export'u CommonJS'ye çevir
  if (content.includes('export const DEFAULT_SETTINGS')) {
    content = content.replace(
      /export const DEFAULT_SETTINGS = \{[\s\S]*?\};/,
      (match) => {
        const value = match.replace('export const DEFAULT_SETTINGS =', '').trim();
        return `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = ${value}`;
      }
    );
    
    fs.writeFileSync(appSettingsPath, content, 'utf8');
    console.log('AppSettings.js CommonJS formatına çevrildi');
  }
} else {
  console.warn('AppSettings.js bulunamadı:', appSettingsPath);
}

