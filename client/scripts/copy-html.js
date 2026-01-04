const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'src', 'renderer');
const targetDir = path.join(__dirname, '..', 'dist', 'renderer');

// Target dizini yoksa oluştur
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// HTML dosyasını kopyala
const htmlSource = path.join(sourceDir, 'index.html');
const htmlTarget = path.join(targetDir, 'index.html');

if (fs.existsSync(htmlSource)) {
  fs.copyFileSync(htmlSource, htmlTarget);
  console.log('HTML dosyası kopyalandı:', htmlTarget);
}

