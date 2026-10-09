// Render the existing startup brand, without redrawing or modifying its proportions.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [process.env.ANDRADE_RENDER_MODULES || process.cwd()] }));
const root = path.resolve(__dirname, '..');
const logo = path.join(root, 'assets/images/andrade-portal-logo-startup.png');
(async () => {
  const brand = await sharp(logo).resize({ width: 680, height: 260, fit: 'inside' }).png().toBuffer();
  const size = await sharp(brand).metadata();
  for (const variant of ['gerador', 'consumidor']) {
    const symbol = variant === 'gerador'
      ? '<circle cx="512" cy="682" r="25" fill="#FFDB39"/><path d="M512 639v-12m0 98v12m-43-55h-12m98 0h12m-75-31-9-9m58 58 9 9m-58-9-9 9m58-58 9-9" stroke="#FFDB39" stroke-width="7" stroke-linecap="round"/>'
      : '<path d="m472 680 40-35 40 35m-69-8v48h58v-48m-39 48v-25h20v25" fill="none" stroke="#08704B" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>';
    const badge = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><circle cx="512" cy="682" r="76" fill="${variant === 'gerador' ? '#08513D' : '#FFF5CB'}"/>${symbol}</svg>`);
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#EEF5F1' } })
      .composite([{ input: brand, left: Math.round((1024-size.width)/2), top: 380 }, { input: badge }])
      .png().toFile(path.join(root, `assets/images/android-brand-${variant}.png`));
  }
})().catch(error => { console.error(error.message); process.exitCode=1; });
