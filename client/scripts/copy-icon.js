const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, '../src/murpicon.svg');
const destIcon = path.join(__dirname, '../dist/murpicon.svg');

try {
  if (fs.existsSync(sourceIcon)) {
    fs.copyFileSync(sourceIcon, destIcon);
    console.log('Icon dosyası kopyalandı: ' + destIcon);
  } else {
    console.warn('Icon dosyası bulunamadı: ' + sourceIcon);
  }
} catch (error) {
  console.error('Icon kopyalama hatası:', error);
  process.exit(1);
}



