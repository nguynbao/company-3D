#!/usr/bin/env node
/**
 * CÔNG CỤ ĐÓNG DẤU LOGO ĐỒNG BỘ TUYỆT ĐỐI CHO PHÒNG DESIGN & VIDEO (11 SPORT - PICKLEBALL & MORE)
 * - Tự động chuẩn hóa (trim vùng trong suốt thừa) bộ 4 file logo gốc từ ~/Downloads/logo
 * - Lưu trực tiếp vào:
 *   1. .agent/skills/design/resources/logo/
 *   2. .agent/skills/video/resources/logo/
 *   3. assets/brand_logo/
 * - Đóng dấu logo lên mọi ấn phẩm hình ảnh / frame video với tỷ lệ kích thước & vị trí cố định 100%:
 *   + Vị trí chuẩn: Góc trên bên phải (top-right) hoặc Góc trên bên trái (top-left)
 *   + Khoảng cách lề an toàn (Margin X = 4.5% chiều rộng, Margin Y = 4.5% chiều rộng)
 *   + Kích thước chuẩn:
 *     * Logo ngang (Horizontal): Rộng đúng 22% chiều rộng khung hình (0.22 * CanvasWidth)
 *     * Logo đứng (Vertical): Rộng đúng 26% chiều rộng khung hình (0.26 * CanvasWidth)
 *   + Tự động đo độ sáng vùng đặt logo để chọn Logo Trắng (nền tối) hoặc Logo Đen (nền sáng)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT_DIR = __dirname.includes(path.join(".agent", "skills"))
  ? path.resolve(__dirname, "..", "..", "..", "..")
  : path.join(__dirname, "..");
const LOGO_DIRS = [
  path.join(ROOT_DIR, ".agent", "skills", "design", "resources", "logo"),
  path.join(ROOT_DIR, ".agent", "skills", "video", "resources", "logo"),
  path.join(ROOT_DIR, "assets", "brand_logo")
];

const SWIFT_HELPER_PATH = path.join(ROOT_DIR, "scripts", "logo_compositor.swift");
const SWIFT_BIN_PATH = path.join(ROOT_DIR, "scripts", "logo_compositor");

const SWIFT_CODE = `
import Foundation
import AppKit
import CoreGraphics
import CoreImage

let ciContext = CIContext(options: [
    .useSoftwareRenderer: false,
    .highQualityDownsample: true,
    .workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!
])

func loadCGImage(_ path: String) -> CGImage? {
    guard let img = NSImage(contentsOfFile: path) else { return nil }
    var rect = CGRect(origin: .zero, size: img.size)
    return img.cgImage(forProposedRect: &rect, context: nil, hints: nil)
}

func enhanceAndUpscaleToUltraHD(_ cgImage: CGImage, minLongEdge: Double = 2048.0) -> CGImage {
    let w = Double(cgImage.width)
    let h = Double(cgImage.height)
    let currentLongEdge = max(w, h)
    let scale = (currentLongEdge < minLongEdge) ? (minLongEdge / currentLongEdge) : 1.0

    var currentCI = CIImage(cgImage: cgImage)

    if scale > 1.001 {
        if let lanczos = CIFilter(name: "CILanczosScaleTransform") {
            lanczos.setValue(currentCI, forKey: kCIInputImageKey)
            lanczos.setValue(scale, forKey: kCIInputScaleKey)
            lanczos.setValue(1.0, forKey: kCIInputAspectRatioKey)
            if let out = lanczos.outputImage {
                currentCI = out
            }
        }
    }

    // Apply subtle Studio Micro-Sharpening (Unsharp Mask) to ensure razor-sharp textures & edges
    if let unsharp = CIFilter(name: "CIUnsharpMask") {
        unsharp.setValue(currentCI, forKey: kCIInputImageKey)
        unsharp.setValue(1.4, forKey: kCIInputRadiusKey)
        unsharp.setValue(scale > 1.001 ? 0.45 : 0.25, forKey: kCIInputIntensityKey)
        if let out = unsharp.outputImage {
            currentCI = out
        }
    }

    let targetRect = CGRect(
        x: 0,
        y: 0,
        width: round(w * scale),
        height: round(h * scale)
    )
    return ciContext.createCGImage(currentCI, from: targetRect) ?? cgImage
}

func saveCGImage(_ cgImage: CGImage, to path: String) -> Bool {
    let rep = NSBitmapImageRep(cgImage: cgImage)
    let ext = (path as NSString).pathExtension.lowercased()
    let fileType: NSBitmapImageRep.FileType = (ext == "png") ? .png : .jpeg
    // Always save at 1.0 (100% Maximum Studio Quality / Lossless)
    let props: [NSBitmapImageRep.PropertyKey: Any] = (ext == "png") ? [:] : [.compressionFactor: 1.0]
    guard let data = rep.representation(using: fileType, properties: props) else { return false }
    do {
        try data.write(to: URL(fileURLWithPath: path))
        return true
    } catch {
        return false
    }
}

func trimTransparentBounds(_ cgImage: CGImage) -> CGImage {
    let width = cgImage.width
    let height = cgImage.height
    let bytesPerPixel = 4
    let bytesPerRow = width * bytesPerPixel
    var pixelData = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(
              data: &pixelData,
              width: width,
              height: height,
              bitsPerComponent: 8,
              bytesPerRow: bytesPerRow,
              space: colorSpace,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          ) else {
        return cgImage
    }
    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

    var minX = width
    var minY = height
    var maxX = 0
    var maxY = 0
    var found = false

    for y in 0..<height {
        for x in 0..<width {
            let alpha = pixelData[(y * width + x) * 4 + 3]
            if alpha > 15 {
                if x < minX { minX = x }
                if x > maxX { maxX = x }
                if y < minY { minY = y }
                if y > maxY { maxY = y }
                found = true
            }
        }
    }

    if !found || maxX <= minX || maxY <= minY {
        return cgImage
    }

    let cropRect = CGRect(x: minX, y: minY, width: (maxX - minX + 1), height: (maxY - minY + 1))
    return cgImage.cropping(to: cropRect) ?? cgImage
}

struct ZoneMetrics {
    let avgLum: Double
    let stdDev: Double
    let maxLum: Double
    let minLum: Double
}

func analyzeLogoZone(in cgImage: CGImage, rect: CGRect) -> ZoneMetrics {
    let cropped = cgImage.cropping(to: rect) ?? cgImage
    let w = min(cropped.width, 96)
    let h = min(cropped.height, 96)
    var pixelData = [UInt8](repeating: 0, count: w * h * 4)
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(
              data: &pixelData,
              width: w,
              height: h,
              bitsPerComponent: 8,
              bytesPerRow: w * 4,
              space: colorSpace,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          ) else {
        return ZoneMetrics(avgLum: 0.2, stdDev: 0.0, maxLum: 0.2, minLum: 0.2)
    }
    ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: w, height: h))
    let count = max(w * h, 1)
    var lums = [Double](repeating: 0, count: count)
    var totalLum = 0.0
    var maxL = 0.0
    var minL = 1.0
    for i in 0..<count {
        let r = Double(pixelData[i * 4]) / 255.0
        let g = Double(pixelData[i * 4 + 1]) / 255.0
        let b = Double(pixelData[i * 4 + 2]) / 255.0
        let l = 0.2126 * r + 0.7152 * g + 0.0722 * b
        lums[i] = l
        totalLum += l
        if l > maxL { maxL = l }
        if l < minL { minL = l }
    }
    let avg = totalLum / Double(count)
    var varianceSum = 0.0
    for l in lums {
        let diff = l - avg
        varianceSum += diff * diff
    }
    let stdDev = sqrt(varianceSum / Double(count))
    return ZoneMetrics(avgLum: avg, stdDev: stdDev, maxLum: maxL, minLum: minL)
}

func drawAdaptiveRadialScrim(
    ctx: CGContext,
    logoRect: CGRect,
    useWhiteLogo: Bool,
    metrics: ZoneMetrics
) {
    // Calculate how much background conflict exists under the logo:
    // If using White Logo, high maxLum or high stdDev means bright highlights/sparks underneath could obscure white strokes.
    // If using Black Logo, low minLum or high stdDev means dark shadows/lines underneath could obscure black strokes.
    let baseScrimAlpha: Double
    if useWhiteLogo {
        let highlightConflict = max(0.0, metrics.maxLum - 0.35) * 0.75 + metrics.stdDev * 1.1
        baseScrimAlpha = min(0.68, max(0.32, 0.28 + highlightConflict))
    } else {
        let shadowConflict = max(0.0, 0.75 - metrics.minLum) * 0.75 + metrics.stdDev * 1.1
        baseScrimAlpha = min(0.68, max(0.34, 0.30 + shadowConflict))
    }

    let cVal: CGFloat = useWhiteLogo ? 0.0 : 1.0
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let gradient = CGGradient(
              colorSpace: colorSpace,
              colorComponents: [
                  cVal, cVal, cVal, CGFloat(baseScrimAlpha),
                  cVal, cVal, cVal, CGFloat(baseScrimAlpha * 0.72),
                  cVal, cVal, cVal, CGFloat(baseScrimAlpha * 0.28),
                  cVal, cVal, cVal, 0.0
              ],
              locations: [0.0, 0.42, 0.74, 1.0],
              count: 4
          ) else {
        return
    }

    // Draw an elliptical radial gradient centered on the logo so it looks like a natural studio lens vignette
    let centerX = logoRect.midX
    let centerY = logoRect.midY
    let radiusX = logoRect.width * 0.78
    let radiusY = logoRect.height * 1.35

    ctx.saveGState()
    ctx.translateBy(x: centerX, y: centerY)
    ctx.scaleBy(x: radiusX, y: radiusY)
    ctx.drawRadialGradient(
        gradient,
        startCenter: .zero,
        startRadius: 0.0,
        endCenter: .zero,
        endRadius: 1.0,
        options: [.drawsBeforeStartLocation]
    )
    ctx.restoreGState()
}

let args = CommandLine.arguments
if args.count >= 4 && args[1] == "trim" {
    let inputPath = args[2]
    let outputPath = args[3]
    guard let src = loadCGImage(inputPath) else {
        fputs("Cannot load image: \\(inputPath)\\n", stderr)
        exit(1)
    }
    let trimmed = trimTransparentBounds(src)
    if !saveCGImage(trimmed, to: outputPath) {
        fputs("Cannot save trimmed image: \\(outputPath)\\n", stderr)
        exit(1)
    }
    print("TRIMMED:\\(trimmed.width)x\\(trimmed.height)")
    exit(0)
}

if args.count >= 8 && args[1] == "stamp" {
    let basePath = args[2]
    let outPath = args[3]
    let whiteLogoPath = args[4]
    let blackLogoPath = args[5]
    let position = args[6]       // top-right | top-left | bottom-right | bottom-left | center-top
    let widthRatio = Double(args[7]) ?? 0.19
    let marginRatio = (args.count >= 9) ? (Double(args[8]) ?? 0.03) : 0.03
    let forcedMode = (args.count >= 10) ? args[9] : "auto" // auto | white | black

    guard let rawBaseImg = loadCGImage(basePath) else {
        fputs("Cannot load base image: \\(basePath)\\n", stderr)
        exit(1)
    }

    // Auto-upscale to minimum 2048px (2K Ultra-HD) + Studio Micro-Sharpening before stamping Logo
    let baseImg = enhanceAndUpscaleToUltraHD(rawBaseImg, minLongEdge: 2048.0)

    let W = Double(baseImg.width)
    let H = Double(baseImg.height)

    guard let whiteLogoRaw = loadCGImage(whiteLogoPath),
          let blackLogoRaw = loadCGImage(blackLogoPath) else {
        fputs("Cannot load logo files\\n", stderr)
        exit(1)
    }

    let whiteLogo = trimTransparentBounds(whiteLogoRaw)
    let blackLogo = trimTransparentBounds(blackLogoRaw)
    let aspect = Double(whiteLogo.height) / Double(max(whiteLogo.width, 1))

    let targetW = round(W * widthRatio)
    let targetH = round(targetW * aspect)
    let marginX = round(W * marginRatio)
    let marginY = round(H * 0.016)

    // CoreGraphics coordinates have origin at bottom-left
    var drawX = W - marginX - targetW
    var drawY = H - marginY - targetH

    if position == "top-left" {
        drawX = marginX
        drawY = H - marginY - targetH
    } else if position == "bottom-right" {
        drawX = W - marginX - targetW
        drawY = marginY
    } else if position == "bottom-left" {
        drawX = marginX
        drawY = marginY
    } else if position == "center-top" {
        drawX = round((W - targetW) / 2.0)
        drawY = H - marginY - targetH
    }

    // Check if the top-right Logo Safe Zone has clutter (text, paddle tip, neon lines, or high contrast details)
    let sampleYTopLeft = H - drawY - targetH
    let paddedSampleRect = CGRect(
        x: max(0, drawX - targetW * 0.08),
        y: max(0, sampleYTopLeft - marginY * 0.5),
        width: min(targetW * 1.16, W - max(0, drawX - targetW * 0.08)),
        height: min(targetH + marginY * 1.4, H)
    )
    let initialMetrics = analyzeLogoZone(in: baseImg, rect: paddedSampleRect)

    // Detect if background elements underneath would obscure or collide with the logo:
    // High stdDev (> 0.055) or wide luminance swing (maxLum - minLum > 0.24) means text, bright lines, or objects are inside the Logo Safe Zone!
    let hasClutterUnderLogo = (initialMetrics.stdDev > 0.055) || ((initialMetrics.maxLum - initialMetrics.minLum) > 0.24)

    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(
              data: nil,
              width: Int(W),
              height: Int(H),
              bitsPerComponent: 8,
              bytesPerRow: Int(W) * 4,
              space: colorSpace,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          ) else {
        fputs("Cannot create CGContext\\n", stderr)
        exit(1)
    }

    ctx.interpolationQuality = .high

    if hasClutterUnderLogo && (position == "top-right" || position == "top-left" || position == "center-top") {
        // AUTO SAFE-ZONE HEADER SHIFT:
        // Push the main artwork down by (targetH + marginY * 1.35) so headlines/paddles never touch the logo,
        // and fill the top header strip with a dark studio ambient backdrop!
        let shiftDown = round(targetH + marginY * 1.35)
        let mainDrawH = H - shiftDown

        // Fill canvas with deep studio dark background first
        ctx.setFillColor(CGColor(srgbRed: 0.035, green: 0.04, blue: 0.065, alpha: 1.0))
        ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

        // Draw heavily blurred, darkened ambient reflection of the top strip in the header zone
        let topStripRect = CGRect(x: 0, y: 0, width: W, height: min(shiftDown * 2.0, H * 0.2))
        if let topStripCG = baseImg.cropping(to: topStripRect) {
            var stripCI = CIImage(cgImage: topStripCG).clampedToExtent()
            if let blur = CIFilter(name: "CIGaussianBlur") {
                blur.setValue(stripCI, forKey: kCIInputImageKey)
                blur.setValue(38.0, forKey: kCIInputRadiusKey)
                if let out = blur.outputImage {
                    stripCI = out
                }
            }
            if let blurredTop = ciContext.createCGImage(stripCI, from: CGRect(x: 0, y: 0, width: topStripCG.width, height: topStripCG.height)) {
                ctx.saveGState()
                ctx.setAlpha(0.32)
                ctx.draw(blurredTop, in: CGRect(x: 0, y: mainDrawH, width: W, height: shiftDown))
                ctx.restoreGState()
            }
        }

        // Draw the shifted main image below the header safe zone
        ctx.draw(baseImg, in: CGRect(x: 0, y: 0, width: W, height: mainDrawH))

        // Smooth gradient blend across the seam at mainDrawH
        if let seamGrad = CGGradient(
            colorSpace: colorSpace,
            colorComponents: [
                0.035, 0.04, 0.065, 0.95,
                0.035, 0.04, 0.065, 0.55,
                0.035, 0.04, 0.065, 0.0
            ],
            locations: [0.0, 0.5, 1.0],
            count: 3
        ) {
            let seamTop = mainDrawH + shiftDown * 0.25
            let seamBottom = mainDrawH - shiftDown * 0.35
            ctx.drawLinearGradient(
                seamGrad,
                start: CGPoint(x: 0, y: seamTop),
                end: CGPoint(x: 0, y: seamBottom),
                options: []
            )
        }
    } else {
        ctx.draw(baseImg, in: CGRect(x: 0, y: 0, width: W, height: H))
    }

    // Re-evaluate zone luminance on the prepared canvas right where the logo will sit
    let canvasSnapshot = ctx.makeImage() ?? baseImg
    let metrics = analyzeLogoZone(in: canvasSnapshot, rect: CGRect(x: max(0, drawX), y: max(0, sampleYTopLeft), width: min(targetW, W), height: min(targetH, H)))

    let useWhite: Bool
    if forcedMode == "white" {
        useWhite = true
    } else if forcedMode == "black" {
        useWhite = false
    } else {
        useWhite = (metrics.avgLum < 0.62)
    }

    let chosenLogo = useWhite ? whiteLogo : blackLogo

    let logoRect = CGRect(x: drawX, y: drawY, width: targetW, height: targetH)
    let scaleFactor = CGFloat(W / 1024.0)

    // LAYER 1 OF SMART CONTRAST SHIELD: Adaptive Soft Radial Scrim to calm any remaining background details beneath logo
    drawAdaptiveRadialScrim(ctx: ctx, logoRect: logoRect, useWhiteLogo: useWhite, metrics: metrics)

    // LAYER 2 OF SMART CONTRAST SHIELD: Tight Contoured Edge Halo (0-offset high-contrast stroke protection)
    ctx.saveGState()
    let tightHaloColor = useWhite
        ? CGColor(srgbRed: 0, green: 0, blue: 0, alpha: 0.90)
        : CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0.92)
    ctx.setShadow(offset: .zero, blur: 2.2 * scaleFactor, color: tightHaloColor)
    ctx.draw(chosenLogo, in: logoRect)
    ctx.draw(chosenLogo, in: logoRect)
    ctx.restoreGState()

    // LAYER 3 OF SMART CONTRAST SHIELD: Directional Studio Elevation Shadow + Crisp Foreground Vector Logo
    ctx.saveGState()
    let dropShadowColor = useWhite
        ? CGColor(srgbRed: 0, green: 0, blue: 0, alpha: 0.75)
        : CGColor(srgbRed: 0, green: 0, blue: 0, alpha: 0.35)
    ctx.setShadow(offset: CGSize(width: 0, height: -2.0 * scaleFactor), blur: 6.5 * scaleFactor, color: dropShadowColor)
    ctx.draw(chosenLogo, in: logoRect)
    ctx.restoreGState()

    guard let outImg = ctx.makeImage(), saveCGImage(outImg, to: outPath) else {
        fputs("Failed to save stamped image\\n", stderr)
        exit(1)
    }

    let shieldMode = hasClutterUnderLogo ? "SafeZoneShift+3PassShield" : "3PassShield"
    print("STAMPED:\\(useWhite ? "WHITE" : "BLACK")@(\\(Int(drawX)),\\(Int(drawY)))_logo=\\(Int(targetW))x\\(Int(targetH))_canvas=\\(Int(W))x\\(Int(H))_UltraHD_\\(shieldMode)")
    exit(0)
}
`;

function ensureSwiftHelper() {
  if (process.platform === "win32") return;
  let needCompile = !fs.existsSync(SWIFT_BIN_PATH);
  if (!fs.existsSync(SWIFT_HELPER_PATH) || fs.readFileSync(SWIFT_HELPER_PATH, "utf8") !== SWIFT_CODE) {
    fs.writeFileSync(SWIFT_HELPER_PATH, SWIFT_CODE, "utf8");
    needCompile = true;
  }
  if (needCompile) {
    execFileSync("swiftc", ["-O", SWIFT_HELPER_PATH, "-o", SWIFT_BIN_PATH], { stdio: "pipe" });
  }
}

function prepareStandardLogoFiles(sourceDownloadDir = "/Users/baonguyenave/Downloads/logo") {
  ensureSwiftHelper();
  for (const d of LOGO_DIRS) {
    fs.mkdirSync(d, { recursive: true });
  }

  const fileMap = [
    { match: "trắng-ngang", outName: "11sport_logo_white_horizontal.png" },
    { match: "đen-ngang", outName: "11sport_logo_black_horizontal.png" },
    { match: "trắng-đứng", outName: "11sport_logo_white_vertical.png" },
    { match: "đen-đứng", outName: "11sport_logo_black_vertical.png" }
  ];

  const sourceDir = fs.existsSync(sourceDownloadDir) ? sourceDownloadDir : LOGO_DIRS[2];
  const entries = fs.readdirSync(sourceDir);

  for (const item of fileMap) {
    const found = entries.find(f => f.normalize("NFC").toLowerCase().includes(item.match));
    if (!found) continue;
    const srcPath = path.join(sourceDir, found);
    const primaryOut = path.join(LOGO_DIRS[0], item.outName);

    if (process.platform === "win32") {
      execFileSync(process.execPath, [path.join(ROOT_DIR, "scripts", "win_stamp_helper.js"), "trim", srcPath, primaryOut], { stdio: "pipe" });
    } else {
      execFileSync(SWIFT_BIN_PATH, ["trim", srcPath, primaryOut], { stdio: "pipe" });
    }
    for (let i = 1; i < LOGO_DIRS.length; i++) {
      fs.copyFileSync(primaryOut, path.join(LOGO_DIRS[i], item.outName));
    }
  }

  // Copy vector files (.ai, .pdf) with clean ASCII names too
  for (const f of entries) {
    const nfc = f.normalize("NFC").toLowerCase();
    if (nfc.endsWith(".pdf")) {
      for (const d of LOGO_DIRS) fs.copyFileSync(path.join(sourceDir, f), path.join(d, "11sport_logo_vector.pdf"));
    } else if (nfc.endsWith(".ai")) {
      for (const d of LOGO_DIRS) fs.copyFileSync(path.join(sourceDir, f), path.join(d, "11sport_logo_vector.ai"));
    }
  }
  console.log("✔ Đã chuẩn hóa và lưu bộ Logo 11 SPORT vào skills Design, Video và assets/brand_logo/");
}

function stampLogoOnImage(imagePath, options = {}) {
  ensureSwiftHelper();
  const logoDir = LOGO_DIRS[0];
  const orientation = options.orientation === "vertical" ? "vertical" : "horizontal";
  const whiteLogo = path.join(logoDir, `11sport_logo_white_${orientation}.png`);
  const blackLogo = path.join(logoDir, `11sport_logo_black_${orientation}.png`);

  if (!fs.existsSync(whiteLogo) || !fs.existsSync(blackLogo)) {
    prepareStandardLogoFiles();
  }

  // Lưu bản gốc chưa đóng dấu vào assets/.unstamped_originals/ để chống đóng dấu đè 2 lần (idempotent 100%)
  const backupDir = path.join(ROOT_DIR, "assets", ".unstamped_originals");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, path.basename(imagePath));
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(imagePath, backupPath);
  }
  const cleanSourcePath = options.outputPath && options.outputPath !== imagePath ? imagePath : backupPath;

  const position = options.position || "top-right";
  const widthRatio = String(options.widthRatio || (orientation === "vertical" ? 0.22 : 0.19));
  const marginRatio = String(options.marginRatio || 0.03);
  const mode = options.mode || "auto";
  const outputPath = options.outputPath || imagePath;

  const out = (process.platform === "win32"
    ? execFileSync(process.execPath, [path.join(ROOT_DIR, "scripts", "win_stamp_helper.js"), "stamp", cleanSourcePath, outputPath, whiteLogo, blackLogo, position, widthRatio, marginRatio, mode], { encoding: "utf8" })
    : execFileSync(SWIFT_BIN_PATH, ["stamp", cleanSourcePath, outputPath, whiteLogo, blackLogo, position, widthRatio, marginRatio, mode], { encoding: "utf8" })
  ).trim();

  console.log(`✔ Đã đóng dấu Logo 11 SPORT đồng bộ lên ${path.basename(outputPath)} -> ${out}`);
  return outputPath;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--init")) {
    prepareStandardLogoFiles();
  } else if (args.includes("--file")) {
    const fileIdx = args.indexOf("--file");
    const targetFile = args[fileIdx + 1];
    const posIdx = args.indexOf("--position");
    const position = posIdx !== -1 ? args[posIdx + 1] : "top-right";
    const modeIdx = args.indexOf("--mode");
    const mode = modeIdx !== -1 ? args[modeIdx + 1] : "auto";
    stampLogoOnImage(path.resolve(targetFile), { position, mode });
  } else if (args.includes("--all-campaign-assets")) {
    prepareStandardLogoFiles();
    const assetsDir = path.join(ROOT_DIR, "assets");
    const files = fs.readdirSync(assetsDir).filter(f => /^DES-.*\.(jpg|jpeg|png)$/i.test(f));
    for (const f of files) {
      stampLogoOnImage(path.join(assetsDir, f), { position: "top-right", mode: "auto" });
    }
  } else {
    console.log("Cách dùng:");
    console.log("  node scripts/stamp_logo.js --init");
    console.log("  node scripts/stamp_logo.js --file <path_to_image> [--position top-right|top-left] [--mode auto|white|black]");
    console.log("  node scripts/stamp_logo.js --all-campaign-assets");
  }
}

module.exports = { prepareStandardLogoFiles, stampLogoOnImage };
