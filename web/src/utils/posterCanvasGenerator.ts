export interface PosterThemePalette {
  id: 'valentine' | 'womens_day' | 'halloween' | 'festive' | 'flash_sale' | 'cyber_sport';
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  primaryAccent: string;
  secondaryAccent: string;
  badgeBg: string;
  badgeText: string;
  glowColor: string;
  label: string;
}

export interface PosterRenderSpec {
  taskId: string;
  revision?: number;
  campaignTitle: string;
  productName: string;
  occasionLabel: string;
  promoHeadline: string;
  uspList: [string, string, string];
  ctaText: string;
  theme: PosterThemePalette;
  productImageUrl?: string;
}

export interface RenderedPosterAsset {
  code: string;
  title: string;
  url: string;
  filePath: string;
  ratio: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Tách nền trắng/sáng đơn sắc của ảnh sản phẩm studio để sản phẩm hòa quyện vào poster chuyên nghiệp
 */
function createTransparentProductCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const maxDim = 900;
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const w = Math.max(1, Math.round((img.width || 600) * scale));
  const h = Math.max(1, Math.round((img.height || 600) * scale));

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) return off;

  ctx.drawImage(img, 0, 0, w, h);
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    // Kiểm tra 4 góc ảnh xem có phải nền trắng/sáng studio không
    const corners = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      ((h - 1) * w + (w - 1)) * 4,
    ];
    let whiteCorners = 0;
    for (const idx of corners) {
      if (data[idx] > 232 && data[idx + 1] > 232 && data[idx + 2] > 232) {
        whiteCorners++;
      }
    }
    if (whiteCorners >= 2) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        if (brightness > 242 && maxDiff < 14) {
          data[i + 3] = 0;
        } else if (brightness > 228 && maxDiff < 18) {
          data[i + 3] = Math.round(((242 - brightness) / 14) * 255);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch {
    // Ignore CORS taint if any
  }
  return off;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        const remaining = words.slice(n).join(' ');
        let clipped = remaining;
        while (ctx.measureText(clipped + '...').width > maxWidth && clipped.length > 0) {
          clipped = clipped.slice(0, -1);
        }
        ctx.fillText(clipped + (clipped.length < remaining.length ? '...' : ''), x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackgroundAndDecor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: PosterThemePalette,
  variant: number
) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, theme.bgStart);
  grad.addColorStop(0.55, theme.bgMid);
  grad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Radial studio glow
  const glow = ctx.createRadialGradient(
    w * 0.5,
    h * (variant === 4 ? 0.48 : 0.52),
    20,
    w * 0.5,
    h * (variant === 4 ? 0.48 : 0.52),
    Math.max(w, h) * 0.52
  );
  glow.addColorStop(0, theme.glowColor);
  glow.addColorStop(0.55, 'rgba(0,0,0,0.1)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Subtle geometric tech grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  const step = 60;
  for (let gx = 0; gx < w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Theme particles / bokeh / hearts for Valentine
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const px = ((i * 197 + variant * 83) % (w - 120)) + 60;
    const py = ((i * 263 + variant * 131) % (h - 120)) + 60;
    const radius = (i % 4) * 5 + 4;
    ctx.fillStyle = i % 2 === 0 ? theme.primaryAccent : theme.secondaryAccent;
    ctx.globalAlpha = 0.14 + (i % 3) * 0.06;

    if (theme.id === 'valentine' && i % 3 === 0) {
      // Vẽ icon trái tim phát sáng cho chủ đề Valentine
      const s = radius * 1.6;
      ctx.beginPath();
      ctx.moveTo(px, py + s * 0.3);
      ctx.bezierCurveTo(px, py, px - s, py, px - s, py + s * 0.45);
      ctx.bezierCurveTo(px - s, py + s * 0.9, px, py + s * 1.25, px, py + s * 1.5);
      ctx.bezierCurveTo(px, py + s * 1.25, px + s, py + s * 0.9, px + s, py + s * 0.45);
      ctx.bezierCurveTo(px + s, py, px, py, px, py + s * 0.3);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Outer luxury frame border
  ctx.save();
  ctx.strokeStyle = theme.primaryAccent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 24, 24, w - 48, h - 48, 24);
  ctx.stroke();
  ctx.restore();
}

function drawProductHero(
  ctx: CanvasRenderingContext2D,
  productCanvas: HTMLCanvasElement | null,
  cx: number,
  cy: number,
  targetSize: number,
  angleDeg: number,
  theme: PosterThemePalette
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);

  // Neon rim ring behind product
  ctx.save();
  ctx.strokeStyle = theme.primaryAccent;
  ctx.lineWidth = 5;
  ctx.shadowColor = theme.primaryAccent;
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.arc(0, 0, targetSize * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (productCanvas) {
    const ratio = productCanvas.width / productCanvas.height;
    let drawW = targetSize;
    let drawH = targetSize;
    if (ratio > 1) {
      drawH = targetSize / ratio;
    } else {
      drawW = targetSize * ratio;
    }
    ctx.shadowColor = theme.primaryAccent;
    ctx.shadowBlur = 40;
    ctx.drawImage(productCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    // Fallback vector 3D product silhouette (Pro Paddle / Luxury Product)
    ctx.shadowColor = theme.primaryAccent;
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = theme.primaryAccent;
    ctx.lineWidth = 8;
    drawRoundedRect(
      ctx,
      -targetSize * 0.28,
      -targetSize * 0.42,
      targetSize * 0.56,
      targetSize * 0.68,
      64
    );
    ctx.fill();
    ctx.stroke();

    // Handle
    ctx.fillStyle = '#1F2937';
    drawRoundedRect(
      ctx,
      -targetSize * 0.06,
      targetSize * 0.26,
      targetSize * 0.12,
      targetSize * 0.24,
      14
    );
    ctx.fill();
  }

  ctx.restore();
}

async function uploadCanvasToAssets(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<{ url: string; filePath: string }> {
  const dataUrl = canvas.toDataURL('image/png', 0.92);
  try {
    const resp = await fetch('/api/assets/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType: 'image/png',
        dataUrl,
        keepExactName: true,
      }),
    });
    const data = await resp.json();
    const uploaded = data.asset || data.attachment;
    if (resp.ok && data.ok && uploaded) {
      return {
        url: uploaded.url,
        filePath: uploaded.path,
      };
    }
  } catch {
    // Fallback to dataUrl if server unreachable
  }
  return {
    url: dataUrl,
    filePath: `assets/${fileName}`,
  };
}

/**
 * Kết xuất 4 ấn phẩm thiết kế MỚI HOÀN TOÀN cho từng chiến dịch và lưu trực tiếp vào thư mục assets/
 */
export async function generateCampaignPosters(
  spec: PosterRenderSpec
): Promise<RenderedPosterAsset[]> {
  const rawImg = spec.productImageUrl ? await loadImageElement(spec.productImageUrl) : null;
  const productCanvas = rawImg ? createTransparentProductCanvas(rawImg) : null;
  const revSuffix = spec.revision && spec.revision > 1 ? `_v${spec.revision}` : '';
  const safeTask = spec.taskId.replace(/[^a-zA-Z0-9_-]/g, '_');

  const configs = [
    {
      code: 'DES-01',
      variant: 1,
      width: 1080,
      height: 1080,
      ratio: '1080x1080px',
      title: `Poster Key Visual: ${spec.occasionLabel}`,
      fileName: `${safeTask}_DES_01_KeyVisual${revSuffix}.png`,
    },
    {
      code: 'DES-02',
      variant: 2,
      width: 1080,
      height: 1350,
      ratio: '1080x1350px',
      title: `Infographic Điểm Nhấn & USP (4:5)`,
      fileName: `${safeTask}_DES_02_Infographic${revSuffix}.png`,
    },
    {
      code: 'DES-03',
      variant: 3,
      width: 1080,
      height: 1080,
      ratio: '1080x1080px',
      title: `Poster Combo & Ưu Đãi Đặc Biệt (1:1)`,
      fileName: `${safeTask}_DES_03_ComboDeal${revSuffix}.png`,
    },
    {
      code: 'DES-04',
      variant: 4,
      width: 1080,
      height: 1920,
      ratio: '1080x1920px',
      title: `Story & TikTok Cover (9:16 Safe Zone)`,
      fileName: `${safeTask}_DES_04_Story9x16${revSuffix}.png`,
    },
  ];

  const results: RenderedPosterAsset[] = [];

  for (const cfg of configs) {
    const canvas = document.createElement('canvas');
    canvas.width = cfg.width;
    canvas.height = cfg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    drawBackgroundAndDecor(ctx, cfg.width, cfg.height, spec.theme, cfg.variant);

    // Top Occasion Pill Badge
    ctx.save();
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    const badgeText = `${spec.occasionLabel.toUpperCase()} • ${spec.taskId}`;
    const badgeW = Math.min(cfg.width - 120, ctx.measureText(badgeText).width + 56);
    const badgeX = (cfg.width - badgeW) / 2;
    const badgeY = cfg.variant === 4 ? 130 : 54;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = spec.theme.primaryAccent;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = spec.theme.primaryAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, cfg.width / 2, badgeY + 25);
    ctx.restore();

    // Main Headline
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 18;
    ctx.font = '900 52px Inter, system-ui, sans-serif';
    const headlineY = cfg.variant === 4 ? 245 : 158;
    const nextY = drawWrappedText(
      ctx,
      spec.campaignTitle.toUpperCase(),
      cfg.width / 2,
      headlineY,
      cfg.width - 130,
      62,
      2
    );

    // Product Subtitle
    ctx.font = '700 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = spec.theme.secondaryAccent;
    ctx.fillText(spec.productName.toUpperCase().slice(0, 48), cfg.width / 2, nextY + 12);
    ctx.restore();

    // Variant-specific Centerpiece
    if (cfg.variant === 1) {
      // DES-01: Hero Key Visual 1:1
      drawProductHero(ctx, productCanvas, cfg.width / 2, cfg.height * 0.54, 520, -14, spec.theme);
    } else if (cfg.variant === 2) {
      // DES-02: Infographic 4:5 with 3 USP Callout Cards
      drawProductHero(ctx, productCanvas, cfg.width * 0.36, cfg.height * 0.54, 520, -8, spec.theme);

      spec.uspList.forEach((usp, idx) => {
        const boxX = cfg.width * 0.54;
        const boxY = cfg.height * 0.38 + idx * 145;
        const boxW = cfg.width * 0.4;
        const boxH = 115;

        // Connector line
        ctx.save();
        ctx.strokeStyle = spec.theme.primaryAccent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cfg.width * 0.42, boxY + boxH / 2);
        ctx.lineTo(boxX, boxY + boxH / 2);
        ctx.stroke();

        ctx.fillStyle = spec.theme.primaryAccent;
        ctx.beginPath();
        ctx.arc(cfg.width * 0.42, boxY + boxH / 2, 7, 0, Math.PI * 2);
        ctx.fill();

        // Callout card
        ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
        ctx.strokeStyle = spec.theme.primaryAccent;
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = spec.theme.primaryAccent;
        ctx.font = '800 20px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`USP 0${idx + 1}`, boxX + 22, boxY + 34);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 22px Inter, system-ui, sans-serif';
        drawWrappedText(ctx, usp, boxX + 22, boxY + 66, boxW - 40, 28, 2);
        ctx.restore();
      });
    } else if (cfg.variant === 3) {
      // DES-03: Combo / Couple Twin Symmetry Poster 1:1
      drawProductHero(
        ctx,
        productCanvas,
        cfg.width * 0.37,
        cfg.height * 0.54,
        440,
        -18,
        spec.theme
      );
      drawProductHero(
        ctx,
        productCanvas,
        cfg.width * 0.63,
        cfg.height * 0.54,
        440,
        18,
        spec.theme
      );

      // Center "+ COMBO" Emblem
      ctx.save();
      ctx.fillStyle = spec.theme.badgeBg;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cfg.width / 2, cfg.height * 0.54, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = spec.theme.badgeText;
      ctx.font = '900 24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('COMBO', cfg.width / 2, cfg.height * 0.54);
      ctx.restore();
    } else {
      // DES-04: Vertical 9:16 TikTok & Story Safe-Zone Cover
      drawProductHero(ctx, productCanvas, cfg.width / 2, cfg.height * 0.5, 680, -12, spec.theme);

      // 3 Horizontal Feature Pills above footer
      spec.uspList.forEach((usp, idx) => {
        const pillW = cfg.width - 160;
        const pillH = 74;
        const pillX = 80;
        const pillY = cfg.height * 0.72 + idx * 90;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = spec.theme.primaryAccent;
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 37);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 25px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`✦ ${usp.slice(0, 52)}`, cfg.width / 2, pillY + pillH / 2);
        ctx.restore();
      });
    }

    // Bottom Promo & CTA Banner
    ctx.save();
    const footerH = cfg.variant === 4 ? 170 : 136;
    const footerY = cfg.height - footerH - (cfg.variant === 4 ? 95 : 44);
    const footerW = cfg.width - 110;
    const footerX = 55;

    ctx.fillStyle = spec.theme.badgeBg;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 24;
    drawRoundedRect(ctx, footerX, footerY, footerW, footerH, 26);
    ctx.fill();

    ctx.fillStyle = spec.theme.badgeText;
    ctx.textAlign = 'center';
    ctx.font = '900 34px Inter, system-ui, sans-serif';
    ctx.fillText(
      spec.promoHeadline.toUpperCase().slice(0, 44),
      cfg.width / 2,
      footerY + footerH * 0.42
    );

    ctx.font = '700 23px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(spec.ctaText.slice(0, 56), cfg.width / 2, footerY + footerH * 0.76);
    ctx.restore();

    const uploaded = await uploadCanvasToAssets(canvas, cfg.fileName);
    results.push({
      code: cfg.code,
      title: cfg.title,
      url: uploaded.url,
      filePath: uploaded.filePath,
      ratio: cfg.ratio,
    });
  }

  return results;
}
