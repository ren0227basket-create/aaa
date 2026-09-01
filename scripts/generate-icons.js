// Node script using sharp to generate icons
// Usage:
// 1) npm install sharp --save-dev
// 2) node scripts/generate-icons.js
const fs = require('fs');
const path = require('path');
async function main(){
  const sharp = require('sharp');
  const src = path.join(__dirname, '..', 'public', 'source-icon.png');
  const out = path.join(__dirname, '..', 'public');
  if(!fs.existsSync(src)){
    console.error('Source image not found:', src);
    process.exit(1);
  }
  console.log('Generating icons from', src);
  await sharp(src).resize(32,32).toFile(path.join(out, 'app-icon-32.png'));
  await sharp(src).resize(192,192).toFile(path.join(out, 'app-icon-192.png'));
  await sharp(src).resize(512,512).toFile(path.join(out, 'app-icon-512.png'));
  await sharp(src).resize(180,180).toFile(path.join(out, 'apple-touch-icon.png'));
  // create favicon.ico from 32px
  await sharp(src).resize(32,32).toFile(path.join(out, 'favicon-32.png'));
  // convert png to ico using png-to-ico if available
  try{
    const pngToIco = require('png-to-ico');
    const ico = await pngToIco(path.join(out, 'favicon-32.png'));
    fs.writeFileSync(path.join(out, 'favicon.ico'), ico);
    fs.unlinkSync(path.join(out, 'favicon-32.png'));
  }catch(err){
    console.warn('png-to-ico not available; leaving favicon-32.png as intermediate. To generate favicon.ico install png-to-ico (npm i png-to-ico)');
  }
  console.log('Icons generated in', out);
}
main().catch((e)=>{ console.error(e); process.exit(1); });
