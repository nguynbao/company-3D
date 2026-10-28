#!/usr/bin/env node
/**
 * Windows Ultra-HD Logo Compositor Helper for stamp_logo.js
 * Mirrors the exact 2K/4K Lanczos3 + Unsharp Mask + 3-Pass Contrast Shield logic of logo_compositor.swift
 */
const fs = require("fs");
const path = require("path");
const ROOT_DIR = path.resolve(__dirname, "..");
const sharp = require(path.join(ROOT_DIR, "node_modules", "sharp"));
const { createCanvas, loadImage } = require(path.join(ROOT_DIR, "node_modules", "@napi-rs/canvas"));

(async () => {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (cmd === "trim") {
    const [, inputPath, outputPath] = args;
    const trimmed = await sharp(inputPath).trim({ threshold: 10 }).png().toBuffer();
    const meta = await sharp(trimmed).metadata();
    fs.writeFileSync(outputPath, trimmed);
    console.log(`TRIMMED:${meta.width}x${meta.height}`);
    process.exit(0);
  }

  if (cmd === "stamp") {
    const [, basePath, outPath, whiteLogoPath, blackLogoPath, position = "top-right", widthRatioStr = "0.19", marginRatioStr = "0.03", forcedMode = "auto"] = args;
    const widthRatio = parseFloat(widthRatioStr) || 0.19;
    const marginRatio = parseFloat(marginRatioStr) || 0.03;

    const meta = await sharp(basePath).metadata();
    const rawW = meta.width || 1080;
    const rawH = meta.height || 1920;
    const minLongEdge = 2048.0;
    const currentLongEdge = Math.max(rawW, rawH);
    const scale = currentLongEdge < minLongEdge ? (minLongEdge / currentLongEdge) : 1.0;
    const W = Math.round(rawW * scale);
    const H = Math.round(rawH * scale);

    const upscaledBuf = await sharp(basePath)
      .resize(W, H, { kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 1.4, m1: 0.5, m2: 0.5 })
      .png()
      .toBuffer();

    const baseImg = await loadImage(upscaledBuf);
    const whiteLogo = await loadImage(whiteLogoPath);
    const blackLogo = await loadImage(blackLogoPath);

    const aspect = whiteLogo.height / Math.max(whiteLogo.width, 1);
    const targetW = Math.round(W * widthRatio);
    const targetH = Math.round(targetW * aspect);
    const marginX = Math.round(W * marginRatio);
    const marginY = Math.round(H * 0.016);

    let drawX = W - marginX - targetW;
    let drawY = marginY;
    if (position === "top-left") {
      drawX = marginX;
      drawY = marginY;
    } else if (position === "bottom-right") {
      drawX = W - marginX - targetW;
      drawY = H - marginY - targetH;
    } else if (position === "bottom-left") {
      drawX = marginX;
      drawY = H - marginY - targetH;
    } else if (position === "center-top") {
      drawX = Math.round((W - targetW) / 2.0);
      drawY = marginY;
    }

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImg, 0, 0, W, H);

    const sampleX = Math.max(0, Math.floor(drawX));
    const sampleY = Math.max(0, Math.floor(drawY));
    const sampleW = Math.min(targetW, W - sampleX);
    const sampleH = Math.min(targetH, H - sampleY);
    const imgData = ctx.getImageData(sampleX, sampleY, Math.max(1, sampleW), Math.max(1, sampleH)).data;

    let totalLum = 0, maxL = 0, minL = 1;
    const count = Math.max(1, imgData.length / 4);
    const lums = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const r = imgData[i * 4] / 255.0;
      const g = imgData[i * 4 + 1] / 255.0;
      const b = imgData[i * 4 + 2] / 255.0;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lums[i] = l;
      totalLum += l;
      if (l > maxL) maxL = l;
      if (l < minL) minL = l;
    }
    const avgLum = totalLum / count;
    let varSum = 0;
    for (let i = 0; i < count; i++) {
      const d = lums[i] - avgLum;
      varSum += d * d;
    }
    const stdDev = Math.sqrt(varSum / count);

    let useWhite = true;
    if (forcedMode === "white") useWhite = true;
    else if (forcedMode === "black") useWhite = false;
    else useWhite = avgLum < 0.62;

    const chosenLogo = useWhite ? whiteLogo : blackLogo;
    const baseScrimAlpha = useWhite
      ? Math.min(0.62, Math.max(0.40, 0.34 + Math.max(0, maxL - 0.35) * 0.75 + stdDev * 1.1))
      : Math.min(0.62, Math.max(0.40, 0.34 + Math.max(0, 0.75 - minL) * 0.75 + stdDev * 1.1));

    // LAYER 1 OF SMART CONTRAST SHIELD: Adaptive Soft Radial Scrim
    ctx.save();
    const centerX = drawX + targetW / 2.0;
    const centerY = drawY + targetH / 2.0;
    const radiusX = targetW * 0.85;
    const radiusY = targetH * 1.50;
    ctx.translate(centerX, centerY);
    ctx.scale(radiusX, radiusY);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const cRGB = useWhite ? "0,0,0" : "255,255,255";
    grad.addColorStop(0.0, `rgba(${cRGB}, ${baseScrimAlpha.toFixed(3)})`);
    grad.addColorStop(0.42, `rgba(${cRGB}, ${(baseScrimAlpha * 0.72).toFixed(3)})`);
    grad.addColorStop(0.74, `rgba(${cRGB}, ${(baseScrimAlpha * 0.28).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(${cRGB}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const scaleFactor = W / 1024.0;
    // LAYER 2 OF SMART CONTRAST SHIELD: Tight Contoured Edge Halo
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 2.5 * scaleFactor;
    ctx.shadowColor = useWhite ? "rgba(0,0,0,0.90)" : "rgba(255,255,255,0.92)";
    ctx.drawImage(chosenLogo, drawX, drawY, targetW, targetH);
    ctx.drawImage(chosenLogo, drawX, drawY, targetW, targetH);
    ctx.restore();

    // LAYER 3 OF SMART CONTRAST SHIELD: Directional Studio Elevation Shadow + Crisp Foreground Vector Logo
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2.0 * scaleFactor;
    ctx.shadowBlur = 6.5 * scaleFactor;
    ctx.shadowColor = useWhite ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)";
    ctx.drawImage(chosenLogo, drawX, drawY, targetW, targetH);
    ctx.restore();

    const ext = path.extname(outPath).toLowerCase();
    const outBuf = ext === ".png" ? canvas.toBuffer("image/png") : canvas.toBuffer("image/jpeg", 100);
    fs.writeFileSync(outPath, outBuf);
    console.log(`STAMPED:${useWhite ? "WHITE" : "BLACK"}@(${Math.round(drawX)},${Math.round(drawY)})_logo=${targetW}x${targetH}_canvas=${W}x${H}_UltraHD_3PassShield`);
    process.exit(0);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
