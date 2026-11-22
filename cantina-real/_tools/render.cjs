// Renderiza posters (PNG), reels (MP4 1080x1920) y GIFs desde studio.html.
// Uso: node render.cjs posters|videos|gifs|all [id]
// Requiere: npm i playwright (usa Microsoft Edge instalado) y ffmpeg en el PATH.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const STUDIO = "file:///" + path.join(__dirname, "studio.html").replace(/\\/g, "/");
const what = process.argv[2] || "all";
const only = process.argv[3];

const data = (() => { const w = {}; new Function("window", fs.readFileSync(path.join(ROOT, "data.js"), "utf8"))(w); return w.CR; })();
const SIZES = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };

async function page(browser, fmt, query) {
  const [w, h] = SIZES[fmt];
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(`${STUDIO}?fmt=${fmt}&${query}`);
  await p.evaluate(() => window.ready);
  return p;
}

async function frames(browser, fmt, id, secs, fps, out, extra) {
  const p = await page(browser, fmt, `anim=${id}`);
  const f = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-", ...extra, out], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => f.on("close", c => (c ? rej(new Error("ffmpeg " + c)) : res())));
  const n = Math.round(secs * fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.seek(t), i / fps);
    const buf = await p.screenshot({ type: "png" });
    if (!f.stdin.write(buf)) await new Promise(r => f.stdin.once("drain", r));
  }
  f.stdin.end();
  await done;
  await p.close();
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  if (what === "posters" || what === "all") {
    fs.mkdirSync(path.join(ROOT, "posters/story"), { recursive: true });
    for (const P of data.POSTERS) {
      if (only && P.id !== only) continue;
      for (const fmt of ["post", "story"]) {
        const p = await page(browser, fmt, `poster=${P.id}`);
        const out = path.join(ROOT, "posters", fmt === "story" ? "story" : "", P.id + ".png");
        await p.screenshot({ path: out });
        await p.close();
      }
      console.log("poster", P.id);
    }
  }
  if (what === "videos" || what === "all") {
    for (const V of data.VIDEOS) {
      if (only && V.id !== only) continue;
      const out = path.join(ROOT, "videos", V.id + ".mp4");
      await frames(browser, "story", V.id, V.secs, 30, out,
        ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart"]);
      console.log("video", V.id);
    }
  }
  if (what === "gifs" || what === "all") {
    for (const G of data.GIFS) {
      if (only && G.id !== only) continue;
      const mp4 = path.join(ROOT, "videos", G.id + ".mp4");
      await frames(browser, "square", G.id, G.secs, 30, mp4, ["-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p", "-vf", "scale=720:720", "-movflags", "+faststart"]);
      const gif = path.join(ROOT, "videos", G.id + ".gif");
      await new Promise((res, rej) => spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-filter_complex",
        "fps=15,scale=540:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", gif],
        { stdio: "inherit" }).on("close", c => (c ? rej(new Error("gif")) : res())));
      console.log("gif", G.id);
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
