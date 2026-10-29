const { chromium } = require('playwright');
const fs = require('fs');
const { spawn } = require('child_process');
(async () => {
  const TL = JSON.parse(fs.readFileSync('timeline.json'));
  const fps = 30, frames = Math.round(TL.total * fps);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', 'mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', 'mrkey-promo-45s.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.addInitScript(tl => { window.TL = tl; }, TL);
  await p.goto('file://' + process.cwd() + '/promo.html');
  await p.evaluate(() => document.fonts.ready);
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await p.evaluate(t => window.renderAt(t), f / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
