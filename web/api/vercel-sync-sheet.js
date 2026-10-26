/**
 * Vercel Serverless Function: /api/vercel-sync-sheet
 * Chuyên trách đồng bộ 9 Sheets TSV + 4 Ấn phẩm thiết kế mới (DES-01..04) + Ảnh sản phẩm gốc
 * lên Google Sheet BaoNguyn-Company khi ứng dụng chạy trên môi trường Vercel / Cloud
 * (nơi không có ổ cứng local hay công cụ sips/curl của macOS).
 */

const DEFAULT_GOOGLE_SHEET_WEB_APP_URL =
  process.env.SHEET_WEB_APP_URL ||
  'https://script.google.com/macros/s/AKfycbxxOImjmBXgQVFAtWEyqDtJPwV5lAR2GOknoXlbuDHswvcpWkfgTrpDlL8IWZ3_ADPeAw/exec';

const FREEIMAGE_API_KEY = '6d207e02198a847aa98d0a2a901485a5';

const N8N_SHEETS_SCHEMA = {
  Brief_Tong_Quan: [
    'Ma_Chien_Dich',
    'Ten_Chien_Dich',
    'Muc_Tieu',
    'San_Pham',
    'Dip_Chu_De',
    'Nen_Tang',
    'KPI',
    'Deadline',
    'Ngan_Sach',
    'Gia_Dinh',
    'Can_CEO_Xac_Nhan',
    'Anh_San_Pham_Preview',
    'Link_Anh_San_Pham_N8N',
  ],
  Phan_Cong_Nhiem_Vu: [
    'Ma_Chien_Dich',
    'Ma_Nhiem_Vu',
    'Phong_Ban',
    'Nhan_Vien_Phu_Trach',
    'Mo_Ta_Nhiem_Vu',
    'Dau_Vao',
    'Dau_Ra',
    'Deadline',
    'Uu_Tien',
    'Trang_Thai',
    'Phu_Thuoc',
    'Ghi_Chu',
  ],
  Ke_Hoach_Chien_Dich: [
    'Ma_Chien_Dich',
    'Giai_Doan',
    'Thoi_Gian',
    'Muc_Tieu_Giai_Doan',
    'Thong_Diep',
    'Kenh',
    'Dinh_Dang',
    'Phong_Ban_Phu_Trach',
    'KPI',
  ],
  Noi_Dung_Bai_Dang: [
    'Ma_Chien_Dich',
    'Ma_Bai',
    'Nen_Tang',
    'Dinh_Dang',
    'Tieu_De_Hook',
    'Caption_Hoan_Chinh',
    'Hashtag',
    'CTA',
    'Hinh_Anh_Preview',
    'Link_Anh_N8N',
    'Ma_Thiet_Ke',
    'Ma_Video',
    'Ngay_Dang',
    'Gio_Dang',
    'Trang_Thai',
  ],
  Brief_Thiet_Ke: [
    'Ma_Chien_Dich',
    'Ma_Thiet_Ke',
    'Loai',
    'Nen_Tang',
    'Kich_Thuoc',
    'Noi_Dung_Chu_Tren_Anh',
    'Bo_Cuc',
    'Mau_Sac_Font',
    'Prompt_Tao_Anh',
    'Hinh_Anh_Preview',
    'Link_Anh_N8N',
    'Deadline',
    'Trang_Thai',
  ],
  Kich_Ban_Dung_Video: [
    'Ma_Chien_Dich',
    'Ma_Video',
    'Phan_Doan',
    'Timecode_Bat_Dau',
    'Timecode_Ket_Thuc',
    'Anh_Nguon_Preview',
    'Link_Nguon_N8N',
    'Cat_Tu_Den',
    'Hieu_Ung_Transition',
    'Chu_Phu_De',
    'Nhac_Am_Thanh',
    'Ty_Le',
    'Ten_File_Xuat',
    'Nhan_Vien_Phu_Trach',
    'Trang_Thai',
  ],
  Lich_Dang_Bai: [
    'Ma_Chien_Dich',
    'Ngay',
    'Gio',
    'Nen_Tang',
    'Ma_Bai',
    'Ma_Thiet_Ke',
    'Ma_Video',
    'Hinh_Anh_Preview',
    'Link_Anh_N8N',
    'Nguoi_Dang',
    'Trang_Thai',
  ],
  QA_QC_Log: [
    'Ma_Chien_Dich',
    'Ma_Kiem_Tra',
    'Doi_Tuong_Kiem_Tra',
    'Phong_Ban_Bi_Kiem_Tra',
    'Hang_Muc',
    'Ket_Qua',
    'Diem',
    'Loi_Cu_The',
    'Huong_Sua',
    'Vong_Kiem_Tra',
    'Nguoi_Kiem_Tra',
    'Trang_Thai',
  ],
  Bao_Cao_Cho_CEO: [
    'Ma_Chien_Dich',
    'Tong_Quan_Ket_Qua',
    'Hang_Muc_Da_Xong',
    'Hang_Muc_Cho_CEO_Duyet',
    'Rui_Ro',
    'De_Xuat_Tiep_Theo',
    'Anh_Goc_Preview',
    'Anh_Thiet_Ke_1',
    'Anh_Thiet_Ke_2',
    'Anh_Thiet_Ke_3',
    'Anh_Thiet_Ke_4',
    'Link_Anh_N8N',
  ],
};

async function uploadBase64ToCdn(base64String) {
  if (!base64String || typeof base64String !== 'string') return '';
  const cleanB64 = base64String.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  if (!cleanB64) return '';

  try {
    const form = new URLSearchParams();
    form.append('key', FREEIMAGE_API_KEY);
    form.append('action', 'upload');
    form.append('source', cleanB64);
    form.append('format', 'json');

    const res = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    if (data && data.status_code === 200 && data.image && data.image.url) {
      return data.image.url;
    }
  } catch (err) {
    console.warn('[VercelSync] Lỗi upload ảnh lên freeimage.host:', err.message);
  }
  return '';
}

function stripAssetPathsFromText(text) {
  if (!text || typeof text !== 'string' || text.startsWith('=IMAGE(')) return text;
  return text
    .replace(/:\s*assets\/[A-Za-z0-9_./,-]+(\s*,\s*assets\/[A-Za-z0-9_./,-]+)*/gi, '')
    .replace(/assets\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)/gi, '')
    .replace(/\s+\|\s+\|/g, ' |')
    .trim();
}

function buildTransformed9Sheets(markdownText, originalProductUrl, designMap) {
  const rawSheets = {};
  const regex = /###\s*SHEET:\s*([A-Za-z0-9_]+)[\s\S]*?```(?:tsv|text|plaintext)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdownText)) !== null) {
    const sheetName = match[1].trim();
    const tsvContent = match[2].trim();
    const lines = tsvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows = lines.slice(1).map((line) => line.split('\t'));
    rawSheets[sheetName] = rows;
  }

  let campaignId = 'MKT-CAMPAIGN';
  if (rawSheets['Brief_Tong_Quan'] && rawSheets['Brief_Tong_Quan'][0]) {
    campaignId = rawSheets['Brief_Tong_Quan'][0][0] || campaignId;
  }

  const designUrls = [
    designMap['DES-01'] || '',
    designMap['DES-02'] || '',
    designMap['DES-03'] || '',
    designMap['DES-04'] || '',
  ].filter(Boolean);

  // 1. Brief_Thiet_Ke
  const transformedBriefThietKe = (rawSheets['Brief_Thiet_Ke'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const maThietKe = row[0] || '';
    const imgUrl = designMap[maThietKe] || originalProductUrl || '';
    return [
      campaignId,
      maThietKe,
      row[1] || '',
      row[2] || '',
      row[3] || '',
      row[4] || '',
      row[5] || '',
      row[6] || '',
      row[7] || '',
      imgUrl ? `=IMAGE("${imgUrl}")` : '',
      imgUrl,
      row[9] || '',
      row[10] || '',
    ];
  });

  // 2. Brief_Tong_Quan
  const transformedBriefTongQuan = (rawSheets['Brief_Tong_Quan'] || []).map((r) => [
    r[0] || campaignId,
    r[1] || '',
    r[2] || '',
    r[3] || '',
    r[4] || '',
    r[5] || '',
    r[6] || '',
    r[7] || '',
    r[8] || '',
    r[9] || '',
    r[10] || '',
    originalProductUrl ? `=IMAGE("${originalProductUrl}")` : '',
    originalProductUrl,
  ]);

  // 3. Phan_Cong_Nhiem_Vu
  const transformedPhanCong = (rawSheets['Phan_Cong_Nhiem_Vu'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    return [campaignId, ...row.map((c) => stripAssetPathsFromText(c))];
  });

  // 4. Ke_Hoach_Chien_Dich
  const transformedKeHoach = (rawSheets['Ke_Hoach_Chien_Dich'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    return [campaignId, ...row];
  });

  // 5. Noi_Dung_Bai_Dang
  const postImageMap = {};
  const transformedNoiDung = (rawSheets['Noi_Dung_Bai_Dang'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const maBai = row[0] || '';
    const taiNguyen = row[7] || '';
    const desMatch = taiNguyen.match(/\b(DES-[A-Z0-9-]+)\b/);
    const vidMatch = taiNguyen.match(/\b(VID-[A-Z0-9-]+)\b/);
    const maThietKe = desMatch ? desMatch[1] : '';
    const maVideo = vidMatch ? vidMatch[1] : '';
    const imgUrl = (maThietKe && designMap[maThietKe]) || originalProductUrl || '';
    if (maBai && imgUrl) postImageMap[maBai] = imgUrl;

    return [
      campaignId,
      maBai,
      row[1] || '',
      row[2] || '',
      row[3] || '',
      row[4] || '',
      row[5] || '',
      row[6] || '',
      imgUrl ? `=IMAGE("${imgUrl}")` : '',
      imgUrl,
      maThietKe,
      maVideo,
      row[8] || '',
      row[9] || '',
      row[10] || '',
    ];
  });

  // 6. Kich_Ban_Dung_Video
  const transformedVideo = (rawSheets['Kich_Ban_Dung_Video'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const clipNguon = row[4] || '';
    const desMatch = clipNguon.match(/\b(DES-[A-Z0-9-]+)\b/);
    const imgUrl =
      (desMatch && designMap[desMatch[1]]) || designUrls[0] || originalProductUrl || '';
    return [
      campaignId,
      row[0] || '',
      row[1] || '',
      row[2] || '',
      row[3] || '',
      imgUrl ? `=IMAGE("${imgUrl}")` : '',
      imgUrl,
      row[5] || '',
      row[6] || '',
      row[7] || '',
      row[8] || '',
      row[9] || '',
      row[10] || '',
      row[11] || '',
      row[12] || '',
    ];
  });

  // 7. Lich_Dang_Bai
  const transformedLichDang = (rawSheets['Lich_Dang_Bai'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    const maBai = row[3] || '';
    const maThietKe = row[4] || '';
    const imgUrl = designMap[maThietKe] || postImageMap[maBai] || originalProductUrl || '';
    return [
      campaignId,
      row[0] || '',
      row[1] || '',
      row[2] || '',
      maBai,
      maThietKe,
      row[5] || '',
      imgUrl ? `=IMAGE("${imgUrl}")` : '',
      imgUrl,
      row[6] || '',
      row[7] || '',
    ];
  });

  // 8. QA_QC_Log
  const transformedQaQc = (rawSheets['QA_QC_Log'] || []).map((r) => {
    const row = r[0] === campaignId ? r.slice(1) : r;
    return [campaignId, ...row.map((c) => stripAssetPathsFromText(c))];
  });

  // 9. Bao_Cao_Cho_CEO
  const transformedBaoCao = (rawSheets['Bao_Cao_Cho_CEO'] || []).map((r) => [
    r[0] || campaignId,
    stripAssetPathsFromText(r[1] || ''),
    stripAssetPathsFromText(r[2] || ''),
    stripAssetPathsFromText(r[3] || ''),
    stripAssetPathsFromText(r[4] || ''),
    stripAssetPathsFromText(r[5] || ''),
    originalProductUrl ? `=IMAGE("${originalProductUrl}")` : '',
    designMap['DES-01'] ? `=IMAGE("${designMap['DES-01']}")` : '',
    designMap['DES-02'] ? `=IMAGE("${designMap['DES-02']}")` : '',
    designMap['DES-03'] ? `=IMAGE("${designMap['DES-03']}")` : '',
    designMap['DES-04'] ? `=IMAGE("${designMap['DES-04']}")` : '',
    [originalProductUrl, ...designUrls].filter(Boolean).join(' | '),
  ]);

  return {
    campaignId,
    sheets: {
      Brief_Tong_Quan: transformedBriefTongQuan,
      Phan_Cong_Nhiem_Vu: transformedPhanCong,
      Ke_Hoach_Chien_Dich: transformedKeHoach,
      Noi_Dung_Bai_Dang: transformedNoiDung,
      Brief_Thiet_Ke: transformedBriefThietKe,
      Kich_Ban_Dung_Video: transformedVideo,
      Lich_Dang_Bai: transformedLichDang,
      QA_QC_Log: transformedQaQc,
      Bao_Cao_Cho_CEO: transformedBaoCao,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      taskId,
      markdownContent,
      originalProductBase64,
      originalProductHttpUrl,
      posterBase64Map = {},
    } = req.body || {};

    if (!markdownContent) {
      return res.status(400).json({ ok: false, error: 'Thiếu markdownContent' });
    }

    // 1. Upload song song ảnh gốc & 4 poster mới (DES-01..04) lên CDN (freeimage.host)
    const codes = ['DES-01', 'DES-02', 'DES-03', 'DES-04'];
    const [uploadedOrigUrl, ...uploadedPosterUrls] = await Promise.all([
      originalProductBase64
        ? uploadBase64ToCdn(originalProductBase64)
        : Promise.resolve(originalProductHttpUrl || ''),
      ...codes.map((code) => uploadBase64ToCdn(posterBase64Map[code])),
    ]);

    const designMap = {};
    codes.forEach((code, idx) => {
      if (uploadedPosterUrls[idx]) {
        designMap[code] = uploadedPosterUrls[idx];
      }
    });

    const finalOriginalUrl =
      uploadedOrigUrl ||
      designMap['DES-01'] ||
      'https://iili.io/nkuxtzg.jpg';

    // 2. Chuyển đổi báo cáo 9 Sheets sang cấu trúc phẳng chuẩn n8n + =IMAGE()
    const { campaignId, sheets } = buildTransformed9Sheets(
      markdownContent,
      finalOriginalUrl,
      designMap
    );

    // 3. Đẩy dữ liệu lên Google Apps Script Web App
    const sheetRes = await fetch(DEFAULT_GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        mode: 'upsert_campaign',
        campaignId: taskId || campaignId,
        schema: N8N_SHEETS_SCHEMA,
        sheets,
      }),
      redirect: 'follow',
    });

    const sheetText = await sheetRes.text();
    let sheetData = {};
    try {
      sheetData = JSON.parse(sheetText);
    } catch {
      sheetData = { raw: sheetText.slice(0, 200) };
    }

    return res.status(200).json({
      ok: true,
      syncedToSheet: true,
      mode: 'vercel_serverless',
      campaignId: taskId || campaignId,
      uploadedImages: {
        original: finalOriginalUrl,
        ...designMap,
      },
      sheetResponse: sheetData,
      sheetUrl:
        'https://docs.google.com/spreadsheets/d/19oW1jOHOw81LpSLwhDWWHY7Cz91BJkjT5WUhBGaekXc/edit',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      syncedToSheet: false,
      error: err.message || 'Lỗi đồng bộ Google Sheet trên Vercel',
    });
  }
}
