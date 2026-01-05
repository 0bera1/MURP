const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceSvg = path.join(__dirname, '..', 'src', 'murpicon.svg');
const outputDir = path.join(__dirname, '..');
const outputIco = path.join(outputDir, 'murpIco.ico');

async function createIcon() {
  try {
    if (!fs.existsSync(sourceSvg)) {
      console.error('SVG dosyası bulunamadı:', sourceSvg);
      process.exit(1);
    }

    console.log('SVG\'den 512x512 PNG oluşturuluyor...');
    
    // Sharp ile SVG'yi 512x512 PNG'ye çevir (electron-builder PNG'yi otomatik olarak .ico'ya çevirebilir)
    const png512 = path.join(outputDir, 'murpIco.png');
    
    await sharp(sourceSvg)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(png512);

    console.log('512x512 PNG oluşturuldu:', png512);
    console.log('Not: Electron-builder PNG dosyasını otomatik olarak .ico formatına çevirecektir.');
    
  } catch (error) {
    console.error('Icon oluşturma hatası:', error);
    process.exit(1);
  }
}

createIcon();

