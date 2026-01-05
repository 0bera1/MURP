const fs = require('fs');
const path = require('path');

const sourceSvg = path.join(__dirname, '../src/murpicon.svg');
const sourcePng = path.join(__dirname, '../murpIco.png');
const destSvg = path.join(__dirname, '../dist/murpicon.svg');
const destPng = path.join(__dirname, '../dist/murpIco.png');

try {
  // SVG dosyasını kopyala
  if (fs.existsSync(sourceSvg)) {
    fs.copyFileSync(sourceSvg, destSvg);
    console.log('SVG icon dosyası kopyalandı: ' + destSvg);
  } else {
    console.warn('SVG icon dosyası bulunamadı: ' + sourceSvg);
  }

  // PNG dosyasını kopyala (Windows için)
  if (fs.existsSync(sourcePng)) {
    fs.copyFileSync(sourcePng, destPng);
    console.log('PNG icon dosyası kopyalandı: ' + destPng);
  } else {
    console.warn('PNG icon dosyası bulunamadı: ' + sourcePng);
  }
} catch (error) {
  console.error('Icon kopyalama hatası:', error);
  process.exit(1);
}




