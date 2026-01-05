const path = require('path');
const os = require('os');

// Electron app name (package.json'dan)
const appName = 'manage-ur-plan';

// Platform'a göre userData path'i
let userDataPath;
if (process.platform === 'win32') {
  userDataPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
} else if (process.platform === 'darwin') {
  userDataPath = path.join(os.homedir(), 'Library', 'Application Support', appName);
} else {
  userDataPath = path.join(os.homedir(), '.config', appName);
}

const dbPath = process.env.DB_PATH || path.join(userDataPath, 'manage_ur_plan.db');

console.log('========================================');
console.log('SQLite Veritabanı Konumu:');
console.log('========================================');
console.log(dbPath);
console.log('========================================');
console.log('\nBu dosyayı DB Browser for SQLite ile açabilirsiniz.');
console.log('İndirme: https://sqlitebrowser.org/');
console.log('\nAlternatif araçlar:');
console.log('- VS Code: SQLite Viewer extension');
console.log('- DBeaver: https://dbeaver.io/');
console.log('- SQLiteStudio: https://sqlitestudio.pl/');
console.log('========================================');

