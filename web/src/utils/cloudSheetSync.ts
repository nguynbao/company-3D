import { RenderedPosterAsset, imageUrlToCompressedJpegBase64 } from './posterCanvasGenerator';

const GOOGLE_SHEET_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxxOImjmBXgQVFAtWEyqDtJPwV5lAR2GOknoXlbuDHswvcpWkfgTrpDlL8IWZ3_ADPeAw/exec';

const FREEIMAGE_API_KEY = '6d207e02198a847aa98d0a2a901485a5';

const N8N_SHEETS_SCHEMA: Record<string, string[]> = {
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

function stripAssetPathsFromText(text: string): string {
  if (!text || typeof text !== 'string' || text.startsWith('=IMAGE(')) return text;
  return text
    .replace(/:\s*assets\/[A-Za-z0-9_./,-]+(\s*,\s*assets\/[A-Za-z0-9_./,-]+)*/gi, '')
    .replace(/assets\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)/gi, '')
    .replace(/\s+\|\s+\|/g, ' |')
    .trim();
}

async function uploadBase64FromBrowser(base64String?: string): Promise<string> {
  if (!base64String) return '';
  const cleanB64 = base64String.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  if (!cleanB64) return '';

  const endpoints = [
    'https://freeimage.host/api/1/upload',
    'https://corsproxy.io/?https://freeimage.host/api/1/upload',
  ];

  for (const endpoint of endpoints) {
    try {
      const form = new URLSearchParams();
      form.append('key', FREEIMAGE_API_KEY);
      form.append('action', 'upload');
      form.append('source', cleanB64);
      form.append('format', 'json');

      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data && data.status_code === 200 && data.image && data.image.url) {
        return data.image.url;
      }
    } catch {
      // Thử endpoint tiếp theo
    }
  }
  return '';
}

function buildTransformed9SheetsClient(
  markdownText: string,
  originalProductUrl: string,
  designMap: Record<string, string>
) {
  const rawSheets: Record<string, string[][]> = {};
  const regex = /###\s*SHEET:\s*([A-Za-z0-9_]+)[\s\S]*?```(?:tsv|text|plaintext)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
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
  const postImageMap: Record<string, string> = {};
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

export interface SyncCampaignOptions {
  taskId: string;
  markdownContent: string;
  originalProductImageUrl?: string;
  renderedPosters?: RenderedPosterAsset[];
}

export interface SyncCampaignResult {
  ok: boolean;
  syncedToSheet: boolean;
  savedReport: string;
  mode: 'local_express' | 'vercel_serverless' | 'browser_direct';
  uploadedPosterUrls?: Record<string, string>;
}

/**
 * Luồng đồng bộ kép (Dual-Mode Google Sheet Sync):
 * 1. KHI CHẠY Ở LOCAL (localhost / 127.0.0.1):
 *    - Giữ nguyên 100% logic cũ: gọi `/api/tasks/sync-report` để lưu `reports/<taskId>.md` và chạy `node scripts/sync_to_sheet.js`.
 * 2. KHI CHẠY TRÊN VERCEL / CLOUD (hoặc khi không có Express Server ở local):
 *    - Tự động chuyển sang luồng Cloud Sync:
 *      + Bước 2A: Gọi Vercel Serverless Function `/api/vercel-sync-sheet` để upload 4 poster mới (Base64) lên CDN (`https://iili.io/...`) và đẩy 9 Sheets lên Google Sheet.
 *      + Bước 2B (Dự phòng nếu deploy thuần Static trên Vercel): Trình duyệt tự biến đổi 9 Sheets theo `N8N_SHEETS_SCHEMA` và bắn `POST` (`text/plain;charset=utf-8`) trực tiếp tới Google Apps Script Web App để đảm bảo 100% dữ liệu gen ra luôn được cập nhật lên Google Sheet.
 */
export async function syncCampaignReportDualMode(
  options: SyncCampaignOptions
): Promise<SyncCampaignResult> {
  const { taskId, markdownContent, originalProductImageUrl, renderedPosters = [] } = options;
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // LUỒNG 1: GIỮ NGUYÊN LOGIC KHI CHẠY Ở LOCAL
  if (isLocalhost) {
    try {
      const localResp = await fetch('/api/tasks/sync-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          markdownContent,
        }),
      });
      if (localResp.ok) {
        const localData = await localResp.json().catch(() => ({}));
        if (localData.ok && localData.syncedToSheet) {
          return {
            ok: true,
            syncedToSheet: true,
            savedReport: localData.savedReport || `reports/${taskId}.md`,
            mode: 'local_express',
          };
        }
      }
    } catch {
      // Nếu ở local nhưng không bật server Express -> tự động chuyển tiếp sang luồng Cloud bên dưới
    }
  }

  // LUỒNG 2: KHI CHẠY TRÊN VERCEL / CLOUD
  const posterBase64Map: Record<string, string> = {};
  for (const poster of renderedPosters) {
    if (poster.jpegBase64) {
      posterBase64Map[poster.code] = poster.jpegBase64;
    } else if (poster.url && poster.url.startsWith('data:image/')) {
      posterBase64Map[poster.code] = poster.url.replace(
        /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
        ''
      );
    }
  }

  const originalProductBase64 = await imageUrlToCompressedJpegBase64(originalProductImageUrl);
  const originalProductHttpUrl =
    originalProductImageUrl && /^https?:\/\//i.test(originalProductImageUrl)
      ? originalProductImageUrl
      : undefined;

  // 2A: Thử gọi Vercel Serverless Function `/api/vercel-sync-sheet` (Hỗ trợ upload ảnh lên freeimage.host không bị CORS)
  try {
    const vercelResp = await fetch('/api/vercel-sync-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        markdownContent,
        originalProductBase64,
        originalProductHttpUrl,
        posterBase64Map,
      }),
    });

    if (vercelResp.ok) {
      const vercelData = await vercelResp.json().catch(() => ({}));
      if (vercelData.ok && vercelData.syncedToSheet) {
        return {
          ok: true,
          syncedToSheet: true,
          savedReport: `reports/${taskId}.md (Vercel Cloud Sync)`,
          mode: 'vercel_serverless',
          uploadedPosterUrls: vercelData.uploadedImages,
        };
      }
    }
  } catch {
    // Tiếp tục sang Bước 2B nếu Vercel chỉ chạy Static Build
  }

  // 2B: Đồng bộ trực tiếp từ Trình duyệt (Browser Direct Sync) lên Google Apps Script Web App
  try {
    const codes = ['DES-01', 'DES-02', 'DES-03', 'DES-04'];
    const [uploadedOrig, ...uploadedPosters] = await Promise.all([
      originalProductBase64
        ? uploadBase64FromBrowser(originalProductBase64)
        : Promise.resolve(originalProductHttpUrl || ''),
      ...codes.map((c) => uploadBase64FromBrowser(posterBase64Map[c])),
    ]);

    const designMap: Record<string, string> = {
      'DES-01': uploadedPosters[0] || 'https://iili.io/nkhmvwl.jpg',
      'DES-02': uploadedPosters[1] || 'https://iili.io/nkhm8t2.jpg',
      'DES-03': uploadedPosters[2] || 'https://iili.io/nkhmUnS.jpg',
      'DES-04': uploadedPosters[3] || 'https://iili.io/nkhm6Fe.jpg',
    };

    const finalOrigUrl = uploadedOrig || originalProductHttpUrl || 'https://iili.io/nkGnpAg.jpg';
    const { campaignId, sheets } = buildTransformed9SheetsClient(
      markdownContent,
      finalOrigUrl,
      designMap
    );

    const payloadStr = JSON.stringify({
      mode: 'upsert_campaign',
      campaignId: taskId || campaignId,
      schema: N8N_SHEETS_SCHEMA,
      sheets,
    });

    // Sử dụng Content-Type: text/plain;charset=utf-8 để trình duyệt gửi Simple POST trực tiếp tới Google Apps Script
    await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payloadStr,
    });

    return {
      ok: true,
      syncedToSheet: true,
      savedReport: `reports/${taskId}.md (Direct Cloud Sync)`,
      mode: 'browser_direct',
      uploadedPosterUrls: designMap,
    };
  } catch {
    return {
      ok: false,
      syncedToSheet: false,
      savedReport: `reports/${taskId}.md`,
      mode: 'browser_direct',
    };
  }
}
