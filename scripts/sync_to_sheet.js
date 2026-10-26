#!/usr/bin/env node
/**
 * Script đồng bộ 9 Sheets chuẩn Database phẳng 100% cho n8n + hiển thị ảnh trực tiếp cho CEO:
 * 1. KHÔNG chèn dòng tiêu đề giả hay dòng trống (1 dòng = 1 record JSON chuẩn khi n8n đọc).
 * 2. Tự động gắn khóa ngoại `Ma_Chien_Dich` vào Cột A của toàn bộ 9 Sheets để n8n Filter theo chiến dịch.
 * 3. Tách riêng cột `Hinh_Anh_Preview` (=IMAGE("https://iili.io/...") để CEO xem trực tiếp trong ô)
 *    và cột `Link_Anh_N8N` (URL sạch https://iili.io/... để n8n lấy link đăng bài tự động).
 * 4. Sheet `Bao_Cao_Cho_CEO`: Mỗi chiến dịch đúng 1 dòng duy nhất, có sẵn các cột hiển thị trực tiếp
 *    Ảnh gốc + 4 Ảnh thiết kế trên cùng dòng đó.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT_DIR, ".agent", "sheet_config.json");
const CACHE_PATH = path.join(ROOT_DIR, ".agent", "image_url_cache_permanent.json");

const N8N_SHEETS_SCHEMA = {
  "Brief_Tong_Quan": [
    "Ma_Chien_Dich", "Ten_Chien_Dich", "Muc_Tieu", "San_Pham", "Dip_Chu_De",
    "Nen_Tang", "KPI", "Deadline", "Ngan_Sach", "Gia_Dinh", "Can_CEO_Xac_Nhan",
    "Anh_San_Pham_Preview", "Link_Anh_San_Pham_N8N"
  ],
  "Phan_Cong_Nhiem_Vu": [
    "Ma_Chien_Dich", "Ma_Nhiem_Vu", "Phong_Ban", "Nhan_Vien_Phu_Trach", "Mo_Ta_Nhiem_Vu",
    "Dau_Vao", "Dau_Ra", "Deadline", "Uu_Tien", "Trang_Thai", "Phu_Thuoc", "Ghi_Chu"
  ],
  "Ke_Hoach_Chien_Dich": [
    "Ma_Chien_Dich", "Giai_Doan", "Thoi_Gian", "Muc_Tieu_Giai_Doan", "Thong_Diep",
    "Kenh", "Dinh_Dang", "Phong_Ban_Phu_Trach", "KPI"
  ],
  "Noi_Dung_Bai_Dang": [
    "Ma_Chien_Dich", "Ma_Bai", "Nen_Tang", "Dinh_Dang", "Tieu_De_Hook",
    "Caption_Hoan_Chinh", "Hashtag", "CTA", "Hinh_Anh_Preview", "Link_Anh_N8N",
    "Ma_Thiet_Ke", "Ma_Video", "Ngay_Dang", "Gio_Dang", "Trang_Thai"
  ],
  "Brief_Thiet_Ke": [
    "Ma_Chien_Dich", "Ma_Thiet_Ke", "Loai", "Nen_Tang", "Kich_Thuoc",
    "Noi_Dung_Chu_Tren_Anh", "Bo_Cuc", "Mau_Sac_Font", "Prompt_Tao_Anh",
    "Hinh_Anh_Preview", "Link_Anh_N8N", "Deadline", "Trang_Thai"
  ],
  "Kich_Ban_Dung_Video": [
    "Ma_Chien_Dich", "Ma_Video", "Phan_Doan", "Timecode_Bat_Dau", "Timecode_Ket_Thuc",
    "Anh_Nguon_Preview", "Link_Nguon_N8N", "Cat_Tu_Den", "Hieu_Ung_Transition",
    "Chu_Phu_De", "Nhac_Am_Thanh", "Ty_Le", "Ten_File_Xuat", "Nhan_Vien_Phu_Trach", "Trang_Thai"
  ],
  "Lich_Dang_Bai": [
    "Ma_Chien_Dich", "Ngay", "Gio", "Nen_Tang", "Ma_Bai",
    "Ma_Thiet_Ke", "Ma_Video", "Hinh_Anh_Preview", "Link_Anh_N8N", "Nguoi_Dang", "Trang_Thai"
  ],
  "QA_QC_Log": [
    "Ma_Chien_Dich", "Ma_Kiem_Tra", "Doi_Tuong_Kiem_Tra", "Phong_Ban_Bi_Kiem_Tra", "Hang_Muc",
    "Ket_Qua", "Diem", "Loi_Cu_The", "Huong_Sua", "Vong_Kiem_Tra", "Nguoi_Kiem_Tra", "Trang_Thai"
  ],
  "Bao_Cao_Cho_CEO": [
    "Ma_Chien_Dich", "Tong_Quan_Ket_Qua", "Hang_Muc_Da_Xong", "Hang_Muc_Cho_CEO_Duyet",
    "Rui_Ro", "De_Xuat_Tiep_Theo",
    "Anh_Goc_Preview", "Anh_Thiet_Ke_1", "Anh_Thiet_Ke_2", "Anh_Thiet_Ke_3",
    "Anh_Thiet_Ke_4", "Anh_Thiet_Ke_5", "Anh_Thiet_Ke_6",
    "Link_Anh_N8N"
  ]
};

function getWebAppUrl() {
  if (process.env.SHEET_WEB_APP_URL) return process.env.SHEET_WEB_APP_URL;
  if (fs.existsSync(CONFIG_PATH)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (cfg.webAppUrl) return cfg.webAppUrl;
  }
  throw new Error("Chưa cấu hình URL Google Apps Script trong .agent/sheet_config.json");
}

function loadImageCache() {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveImageCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

function resolveAssetPath(relOrAbsPath) {
  const cleanRel = relOrAbsPath.trim().replace(/^\/+/, "");
  const directAbs = path.isAbsolute(cleanRel) ? cleanRel : path.join(ROOT_DIR, cleanRel);
  if (fs.existsSync(directAbs)) return directAbs;

  // Tìm trong thư mục assets/ nếu file có tiền tố timestamp (VD: 1792976396495_MKT-20261026-924_DES_01_KeyVisual.png)
  const assetsDir = path.join(ROOT_DIR, "assets");
  if (!fs.existsSync(assetsDir)) return null;

  const targetBase = path.basename(cleanRel).toLowerCase();
  const targetNormalized = targetBase.replace(/[^a-z0-9.]/g, "_");
  const candidates = fs
    .readdirSync(assetsDir)
    .filter(f => {
      const lower = f.toLowerCase();
      const norm = lower.replace(/[^a-z0-9.]/g, "_");
      return (
        lower === targetBase ||
        lower.endsWith(`_${targetBase}`) ||
        norm === targetNormalized ||
        norm.endsWith(`_${targetNormalized}`)
      );
    })
    .map(f => {
      const full = path.join(assetsDir, f);
      const stat = fs.statSync(full);
      return { full, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates.length > 0 ? candidates[0].full : null;
}

function uploadLocalImageForSheet(relOrAbsPath) {
  if (!relOrAbsPath || typeof relOrAbsPath !== "string") return null;
  const cache = loadImageCache();
  const absPath = resolveAssetPath(relOrAbsPath);
  if (!absPath || !fs.existsSync(absPath)) {
    console.warn("Không tìm thấy file ảnh local:", relOrAbsPath);
    return null;
  }

  const stat = fs.statSync(absPath);
  const relKey = path.relative(ROOT_DIR, absPath);
  const cacheKey = `${relKey}_${stat.mtimeMs}`;
  if (cache[cacheKey] && cache[cacheKey].startsWith("https://iili.io/")) {
    return cache[cacheKey];
  }

  const thumbsDir = path.join(ROOT_DIR, "assets", "thumbs");
  fs.mkdirSync(thumbsDir, { recursive: true });
  const baseName = path.basename(absPath, path.extname(absPath)) + ".jpg";
  const thumbPath = path.join(thumbsDir, baseName);

  let uploadSourcePath = thumbPath;
  try {
    execSync(`sips -s format jpeg -Z 800 "${absPath}" --out "${thumbPath}" >/dev/null 2>&1`);
    if (!fs.existsSync(thumbPath) || fs.statSync(thumbPath).size < 500) {
      uploadSourcePath = absPath;
    }
  } catch (e) {
    uploadSourcePath = absPath;
  }

  try {
    const out = execSync(
      `curl -s --max-time 25 -F "source=@${uploadSourcePath}" "https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5"`,
      { encoding: "utf8" }
    );
    const json = JSON.parse(out);
    if (json && json.status_code === 200 && json.image && json.image.url) {
      const directUrl = json.image.url;
      cache[cacheKey] = directUrl;
      saveImageCache(cache);
      console.log(`✔ Đã upload ảnh lên Sheet CDN: ${relKey} -> ${directUrl}`);
      return directUrl;
    }
  } catch (err) {
    console.warn("Không thể upload ảnh:", relKey, err.message);
  }
  return null;
}

function extractImageUrlFromCell(cellValue, designMap = {}) {
  if (!cellValue || typeof cellValue !== "string") return "";
  const regex = /(assets\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp))/gi;
  const matches = [...cellValue.matchAll(regex)].map(m => m[1]);

  // Ưu tiên nếu có mã thiết kế DES-xxx trong ô
  const desMatch = cellValue.match(/\b(DES-[A-Z0-9-]+)\b/);
  if (desMatch && designMap[desMatch[1]]) {
    return designMap[desMatch[1]];
  }

  if (matches.length > 0) {
    const chosenPath = matches[matches.length - 1];
    return uploadLocalImageForSheet(chosenPath) || "";
  }
  return "";
}

function stripAssetPathsFromText(text) {
  if (!text || typeof text !== "string" || text.startsWith("=IMAGE(")) return text;
  return text
    .replace(/:\s*assets\/[A-Za-z0-9_./,-]+(\s*,\s*assets\/[A-Za-z0-9_./,-]+)*/gi, "")
    .replace(/assets\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)/gi, "")
    .replace(/\s+\|\s+\|/g, " |")
    .trim();
}

function parse9SheetsFromMarkdown(markdownText) {
  const rawSheets = {};
  const regex = /###\s*SHEET:\s*([A-Za-z0-9_]+)[\s\S]*?```(?:tsv|text|plaintext)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdownText)) !== null) {
    const sheetName = match[1].trim();
    const tsvContent = match[2].trim();
    const lines = tsvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    const rows = lines.slice(1).map(line => line.split("\t"));
    rawSheets[sheetName] = rows;
  }

  let campaignId = "CAMP-20261025-HLW";
  if (rawSheets["Brief_Tong_Quan"] && rawSheets["Brief_Tong_Quan"][0]) {
    campaignId = rawSheets["Brief_Tong_Quan"][0][0] || campaignId;
  }

  const briefRowText = (rawSheets["Brief_Tong_Quan"] && rawSheets["Brief_Tong_Quan"][0]) ? rawSheets["Brief_Tong_Quan"][0].join(" ") : "";
  const originalProductUrl = extractImageUrlFromCell(briefRowText) || uploadLocalImageForSheet("assets/vendy_super_power_original.png") || uploadLocalImageForSheet("assets/pikdy_strive_16mm.png") || "";

  // 1. Xử lý Brief_Thiet_Ke trước để lấy map Ma_Thiet_Ke -> URL
  const designMap = {};
  const designUrls = [];
  const transformedBriefThietKe = [];
  if (rawSheets["Brief_Thiet_Ke"]) {
    for (const r of rawSheets["Brief_Thiet_Ke"]) {
      // r gốc: Ma_Thiet_Ke(0), Loai(1), Nen_Tang(2), Kich_Thuoc(3), Noi_Dung_Chu_Tren_Anh(4), Bo_Cuc(5), Mau_Sac_Font(6), Prompt_Tao_Anh(7), File_Tham_Chieu(8), Deadline(9), Trang_Thai(10)
      const hasCampaignCol = r[0] === campaignId;
      const row = hasCampaignCol ? r.slice(1) : r;
      const maThietKe = row[0];
      const imgUrl = extractImageUrlFromCell(row[8]);
      if (maThietKe && imgUrl) {
        designMap[maThietKe] = imgUrl;
        designUrls.push(imgUrl);
      }
      transformedBriefThietKe.push([
        campaignId,
        row[0] || "",
        row[1] || "",
        row[2] || "",
        row[3] || "",
        row[4] || "",
        row[5] || "",
        row[6] || "",
        row[7] || "",
        imgUrl ? `=IMAGE("${imgUrl}")` : "",
        imgUrl,
        row[9] || "",
        row[10] || ""
      ]);
    }
  }

  // 2. Brief_Tong_Quan
  const transformedBriefTongQuan = (rawSheets["Brief_Tong_Quan"] || []).map(r => [
    r[0] || campaignId,
    r[1] || "",
    r[2] || "",
    r[3] || "",
    r[4] || "",
    r[5] || "",
    r[6] || "",
    r[7] || "",
    r[8] || "",
    r[9] || "",
    r[10] || "",
    originalProductUrl ? `=IMAGE("${originalProductUrl}")` : "",
    originalProductUrl
  ]);

  // 3. Phan_Cong_Nhiem_Vu
  const transformedPhanCong = (rawSheets["Phan_Cong_Nhiem_Vu"] || []).map(r => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    return [campaignId, ...row.map(c => stripAssetPathsFromText(c))];
  });

  // 4. Ke_Hoach_Chien_Dich
  const transformedKeHoach = (rawSheets["Ke_Hoach_Chien_Dich"] || []).map(r => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    return [campaignId, ...row];
  });

  // 5. Noi_Dung_Bai_Dang
  // Gốc: Ma_Bai(0), Nen_Tang(1), Dinh_Dang(2), Tieu_De_Hook(3), Caption_Hoan_Chinh(4), Hashtag(5), CTA(6), Tai_Nguyen_Dinh_Kem(7), Ngay_Dang(8), Gio_Dang(9), Trang_Thai(10)
  const postImageMap = {};
  const transformedNoiDung = (rawSheets["Noi_Dung_Bai_Dang"] || []).map(r => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const maBai = row[0] || "";
    const taiNguyen = row[7] || "";
    const desMatch = taiNguyen.match(/\b(DES-[A-Z0-9-]+)\b/);
    const vidMatch = taiNguyen.match(/\b(VID-[A-Z0-9-]+)\b/);
    const maThietKe = desMatch ? desMatch[1] : "";
    const maVideo = vidMatch ? vidMatch[1] : "";
    const imgUrl = extractImageUrlFromCell(taiNguyen, designMap) || originalProductUrl;
    if (maBai && imgUrl) postImageMap[maBai] = imgUrl;

    return [
      campaignId,
      maBai,
      row[1] || "",
      row[2] || "",
      row[3] || "",
      row[4] || "",
      row[5] || "",
      row[6] || "",
      imgUrl ? `=IMAGE("${imgUrl}")` : "",
      imgUrl,
      maThietKe,
      maVideo,
      row[8] || "",
      row[9] || "",
      row[10] || ""
    ];
  });

  // 6. Kich_Ban_Dung_Video
  // Gốc: Ma_Video(0), Phan_Doan(1), Timecode_Bat_Dau(2), Timecode_Ket_Thuc(3), Clip_Nguon(4), Cat_Tu_Den(5), Hieu_Ung_Transition(6), Chu_Phu_De(7), Nhac_Am_Thanh(8), Ty_Le(9), Ten_File_Xuat(10), Nhan_Vien_Phu_Trach(11), Trang_Thai(12)
  const transformedVideo = (rawSheets["Kich_Ban_Dung_Video"] || []).map(r => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const imgUrl = extractImageUrlFromCell(row[4], designMap) || originalProductUrl;
    return [
      campaignId,
      row[0] || "",
      row[1] || "",
      row[2] || "",
      row[3] || "",
      imgUrl ? `=IMAGE("${imgUrl}")` : "",
      imgUrl,
      row[5] || "",
      row[6] || "",
      row[7] || "",
      row[8] || "",
      row[9] || "",
      row[10] || "",
      row[11] || "",
      row[12] || ""
    ];
  });

  // 7. Lich_Dang_Bai
  // Gốc: Ngay(0), Gio(1), Nen_Tang(2), Ma_Bai(3), Ma_Thiet_Ke(4), Ma_Video(5), Nguoi_Dang(6), Trang_Thai(7)
  const transformedLichDang = (rawSheets["Lich_Dang_Bai"] || []).map(r => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const maBai = row[3] || "";
    const maThietKe = row[4] || "";
    const imgUrl = designMap[maThietKe] || postImageMap[maBai] || originalProductUrl;
    return [
      campaignId,
      row[0] || "",
      row[1] || "",
      row[2] || "",
      maBai,
      maThietKe,
      row[5] || "",
      imgUrl ? `=IMAGE("${imgUrl}")` : "",
      imgUrl,
      row[6] || "",
      row[7] || ""
    ];
  });

  // 8. QA_QC_Log
  const transformedQaQc = (rawSheets["QA_QC_Log"] || []).map(r => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    return [campaignId, ...row.map(c => stripAssetPathsFromText(c))];
  });

  // 9. Bao_Cao_Cho_CEO (Đúng 1 dòng duy nhất cho mỗi chiến dịch, kèm 7 cột hiển thị ảnh trực tiếp: 1 gốc + 6 thiết kế + 1 cột Link_Anh_N8N)
  const transformedBaoCao = (rawSheets["Bao_Cao_Cho_CEO"] || []).map(r => [
    r[0] || campaignId,
    stripAssetPathsFromText(r[1] || ""),
    stripAssetPathsFromText(r[2] || ""),
    stripAssetPathsFromText(r[3] || ""),
    stripAssetPathsFromText(r[4] || ""),
    stripAssetPathsFromText(r[5] || ""),
    originalProductUrl ? `=IMAGE("${originalProductUrl}")` : "",
    designUrls[0] ? `=IMAGE("${designUrls[0]}")` : "",
    designUrls[1] ? `=IMAGE("${designUrls[1]}")` : "",
    designUrls[2] ? `=IMAGE("${designUrls[2]}")` : "",
    designUrls[3] ? `=IMAGE("${designUrls[3]}")` : "",
    designUrls[4] ? `=IMAGE("${designUrls[4]}")` : "",
    designUrls[5] ? `=IMAGE("${designUrls[5]}")` : "",
    [originalProductUrl, ...designUrls].filter(Boolean).join(" | ")
  ]);

  return {
    campaignId,
    sheets: {
      "Brief_Tong_Quan": transformedBriefTongQuan,
      "Phan_Cong_Nhiem_Vu": transformedPhanCong,
      "Ke_Hoach_Chien_Dich": transformedKeHoach,
      "Noi_Dung_Bai_Dang": transformedNoiDung,
      "Brief_Thiet_Ke": transformedBriefThietKe,
      "Kich_Ban_Dung_Video": transformedVideo,
      "Lich_Dang_Bai": transformedLichDang,
      "QA_QC_Log": transformedQaQc,
      "Bao_Cao_Cho_CEO": transformedBaoCao
    }
  };
}

async function testConnection() {
  const url = getWebAppUrl();
  console.log("Đang kiểm tra kết nối tới:", url);
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log("Kết quả:", JSON.stringify(data, null, 2));
    return data;
  } catch (e) {
    console.error("Phản hồi không phải JSON:", text.slice(0, 300));
    process.exit(1);
  }
}

async function pushMarkdownReport(filePath, mode = "upsert_campaign") {
  const url = getWebAppUrl();
  const content = fs.readFileSync(filePath, "utf8");
  const { campaignId, sheets } = parse9SheetsFromMarkdown(content);

  console.log(`Đang đồng bộ Chiến dịch [${campaignId}] theo cấu trúc phẳng chuẩn n8n (mode: ${mode})...`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      mode,
      campaignId,
      schema: N8N_SHEETS_SCHEMA,
      sheets
    }),
    redirect: "follow"
  });

  const data = await res.json();
  console.log("Kết quả đồng bộ:", JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--test")) {
    await testConnection();
  } else if (args.includes("--file")) {
    const idx = args.indexOf("--file");
    const filePath = args[idx + 1];
    const mode = args.includes("--replace")
      ? "replace"
      : args.includes("--append")
      ? "append"
      : "upsert_campaign";
    await pushMarkdownReport(filePath, mode);
  } else {
    console.log("Sử dụng: node scripts/sync_to_sheet.js --test | --file <path> [--replace | --append]");
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error("Lỗi:", err.message);
    process.exit(1);
  });
}

module.exports = { testConnection, pushMarkdownReport, parse9SheetsFromMarkdown };
