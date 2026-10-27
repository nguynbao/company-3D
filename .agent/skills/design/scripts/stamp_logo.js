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

func loadCGImage(_ path: String) -> CGImage? {
    guard let img = NSImage(contentsOfFile: path) else { return nil }
    var rect = CGRect(origin: .zero, size: img.size)
    return img.cgImage(forProposedRect: &rect, context: nil, hints: nil)
}

func saveCGImage(_ cgImage: CGImage, to path: String) -> Bool {
    let rep = NSBitmapImageRep(cgImage: cgImage)
    let ext = (path as NSString).pathExtension.lowercased()
    let fileType: NSBitmapImageRep.FileType = (ext == "png") ? .png : .jpeg
    let props: [NSBitmapImageRep.PropertyKey: Any] = (ext == "png") ? [:] : [.compressionFactor: 0.94]
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

func averageLuminance(in cgImage: CGImage, rect: CGRect) -> Double {
    let cropped = cgImage.cropping(to: rect) ?? cgImage
    let w = min(cropped.width, 64)
    let h = min(cropped.height, 64)
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
        return 0.2
    }
    ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: w, height: h))
    var totalLum = 0.0
    let count = w * h
    for i in 0..<count {
        let r = Double(pixelData[i * 4]) / 255.0
        let g = Double(pixelData[i * 4 + 1]) / 255.0
        let b = Double(pixelData[i * 4 + 2]) / 255.0
        totalLum += (0.2126 * r + 0.7152 * g + 0.0722 * b)
    }
    return totalLum / Double(max(count, 1))
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

    guard let baseImg = loadCGImage(basePath) else {
        fputs("Cannot load base image: \\(basePath)\\n", stderr)
        exit(1)
    }

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

    // For top-left origin cropping (CGImage.cropping uses top-left origin)
    let sampleYTopLeft = H - drawY - targetH
    let sampleRect = CGRect(x: max(0, drawX), y: max(0, sampleYTopLeft), width: min(targetW, W), height: min(targetH, H))
    let lum = averageLuminance(in: baseImg, rect: sampleRect)

    let useWhite: Bool
    if forcedMode == "white" {
        useWhite = true
    } else if forcedMode == "black" {
        useWhite = false
    } else {
        useWhite = (lum < 0.58)
    }

    let chosenLogo = useWhite ? whiteLogo : blackLogo

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
    ctx.draw(baseImg, in: CGRect(x: 0, y: 0, width: W, height: H))

    // Draw crisp micro-shadow so logo is 100% legible without blurring inner cutouts
    ctx.saveGState()
    let shadowColor = useWhite
        ? CGColor(srgbRed: 0, green: 0, blue: 0, alpha: 0.45)
        : CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0.45)
    ctx.setShadow(offset: CGSize(width: 0, height: -1), blur: 2.5, color: shadowColor)
    ctx.draw(chosenLogo, in: CGRect(x: drawX, y: drawY, width: targetW, height: targetH))
    ctx.restoreGState()

    guard let outImg = ctx.makeImage(), saveCGImage(outImg, to: outPath) else {
        fputs("Failed to save stamped image\\n", stderr)
        exit(1)
    }

    print("STAMPED:\\(useWhite ? "WHITE" : "BLACK")@(\\(Int(drawX)),\\(Int(drawY)))_size=\\(Int(targetW))x\\(Int(targetH))")
    exit(0)
}
`;

function ensureSwiftHelper() {
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

    execFileSync(SWIFT_BIN_PATH, ["trim", srcPath, primaryOut], { stdio: "pipe" });
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

  const out = execFileSync(
    SWIFT_BIN_PATH,
    ["stamp", cleanSourcePath, outputPath, whiteLogo, blackLogo, position, widthRatio, marginRatio, mode],
    { encoding: "utf8" }
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
