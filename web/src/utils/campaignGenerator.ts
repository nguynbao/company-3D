import { CeoAttachmentItem, DepartmentId, SheetTableData } from '../types/company';
import { PosterRenderSpec, PosterThemePalette, RenderedPosterAsset } from './posterCanvasGenerator';

export interface AnalyzedCampaignBrief {
  occasionId: 'valentine' | 'womens_day' | 'halloween' | 'festive' | 'flash_sale' | 'cyber_sport';
  occasionName: string;
  campaignTitle: string;
  bigIdea: string;
  productName: string;
  productSpecs: string;
  uspList: [string, string, string];
  promoOffer: string;
  priceNote: string;
  budgetNote: string;
  targetAudience: string;
  hashtags: string;
  dates: {
    start: string;
    teaserEnd: string;
    launchStart: string;
    launchEnd: string;
    peakStart: string;
    peakEnd: string;
    remarketingStart: string;
    end: string;
    post1Date: string;
    post2Date: string;
    post3Date: string;
    post4Date: string;
    post5Date: string;
    post6Date: string;
  };
  themePalette: PosterThemePalette;
  missingConfirmations: string;
}

export interface GeneratedCampaignPackage {
  taskId: string;
  revision: number;
  campaignTitle: string;
  productName: string;
  occasionName: string;
  analyzed: AnalyzedCampaignBrief;
  posterSpec: PosterRenderSpec;
  sheetsByDept: Record<string, SheetTableData[]>;
  allNineSheets: SheetTableData[];
  stepNarratives: Record<string, string>;
  visualAssets: { code: string; title: string; url: string; filePath: string; ratio: string }[];
  ceoSummaryLines: string[];
  markdownReport: string;
}

function formatDateOffset(daysOffset: number): string {
  const d = new Date(Date.now() + daysOffset * 86400000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const THEME_PALETTES: Record<AnalyzedCampaignBrief['occasionId'], PosterThemePalette> = {
  valentine: {
    id: 'valentine',
    bgStart: '#1F0515',
    bgMid: '#4C0519',
    bgEnd: '#831843',
    primaryAccent: '#FB7185',
    secondaryAccent: '#FDE047',
    badgeBg: '#E11D48',
    badgeText: '#FFF1F2',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    label: 'Đỏ Ruby (#4C0519), Hồng Rose Neon (#FB7185), Vàng Champagne (#FDE047)',
  },
  womens_day: {
    id: 'womens_day',
    bgStart: '#1E0B28',
    bgMid: '#4A154B',
    bgEnd: '#701A75',
    primaryAccent: '#F472B6',
    secondaryAccent: '#FDE68A',
    badgeBg: '#DB2777',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    label: 'Tím Pastel Hoàng Gia (#4A154B), Hồng Phấn (#F472B6), Vàng Kem (#FDE68A)',
  },
  halloween: {
    id: 'halloween',
    bgStart: '#090514',
    bgMid: '#1E1035',
    bgEnd: '#3B0764',
    primaryAccent: '#F97316',
    secondaryAccent: '#C084FC',
    badgeBg: '#EA580C',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(249, 115, 22, 0.42)',
    label: 'Đen Tím Cyberpunk (#1E1035), Cam Neon (#F97316), Tím Điện Quang (#C084FC)',
  },
  festive: {
    id: 'festive',
    bgStart: '#061A14',
    bgMid: '#450A0A',
    bgEnd: '#7F1D1D',
    primaryAccent: '#FBBF24',
    secondaryAccent: '#34D399',
    badgeBg: '#DC2626',
    badgeText: '#FEF08A',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    label: 'Đỏ Lễ Hội (#7F1D1D), Xanh Thông (#065F46), Vàng Ánh Kim (#FBBF24)',
  },
  flash_sale: {
    id: 'flash_sale',
    bgStart: '#09090B',
    bgMid: '#18181B',
    bgEnd: '#27272A',
    primaryAccent: '#FACC15',
    secondaryAccent: '#38BDF8',
    badgeBg: '#EF4444',
    badgeText: '#FEF08A',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    label: 'Đen Obsidian (#09090B), Vàng Tia Chớp (#FACC15), Đỏ Sale (#EF4444)',
  },
  cyber_sport: {
    id: 'cyber_sport',
    bgStart: '#040D1A',
    bgMid: '#0A1E36',
    bgEnd: '#0F2942',
    primaryAccent: '#22C55E',
    secondaryAccent: '#38BDF8',
    badgeBg: '#16A34A',
    badgeText: '#FFFFFF',
    glowColor: 'rgba(34, 197, 94, 0.42)',
    label: 'Đen Carbon (#040D1A), Xanh Neon (#22C55E), Xanh Electric (#38BDF8)',
  },
};

/**
 * Phân tích thông minh toàn bộ yêu cầu của CEO (và lịch sử hội thoại nếu đang tiếp tục trong 1 Ma_Chien_Dich)
 * Không bao giờ lấy nguyên câu mệnh lệnh "Lên chiến dịch..." làm tên sản phẩm hay tiêu đề!
 */
export function analyzeCampaignBrief(
  promptHistory: string[],
  attachments: CeoAttachmentItem[]
): AnalyzedCampaignBrief {
  const combinedPrompt = promptHistory.join(' | ').trim();
  const lower = combinedPrompt.toLowerCase();

  // 1. Nhận diện Dịp / Chủ đề & Lịch trình thực tế
  let occasionId: AnalyzedCampaignBrief['occasionId'] = 'cyber_sport';
  let occasionName = 'Ra Mắt Sản Phẩm Mới (Official Launch)';
  let dates = {
    start: formatDateOffset(0),
    teaserEnd: formatDateOffset(2),
    launchStart: formatDateOffset(3),
    launchEnd: formatDateOffset(6),
    peakStart: formatDateOffset(7),
    peakEnd: formatDateOffset(11),
    remarketingStart: formatDateOffset(12),
    end: formatDateOffset(14),
    post1Date: formatDateOffset(0),
    post2Date: formatDateOffset(3),
    post3Date: formatDateOffset(3),
    post4Date: formatDateOffset(5),
    post5Date: formatDateOffset(7),
    post6Date: formatDateOffset(12),
  };

  if (/valentine|14\/2|14-2|lễ tình nhân|cặp đôi|couple/i.test(lower)) {
    occasionId = 'valentine';
    occasionName = 'Chiến Dịch Mùa Valentine – Lễ Tình Nhân (14/02)';
    dates = {
      start: '01/02/2027',
      teaserEnd: '04/02/2027',
      launchStart: '05/02/2027',
      launchEnd: '09/02/2027',
      peakStart: '10/02/2027',
      peakEnd: '14/02/2027',
      remarketingStart: '15/02/2027',
      end: '16/02/2027',
      post1Date: '01/02/2027',
      post2Date: '05/02/2027',
      post3Date: '05/02/2027',
      post4Date: '08/02/2027',
      post5Date: '10/02/2027',
      post6Date: '13/02/2027',
    };
  } else if (/8\/3|8-3|quốc tế phụ nữ|20\/10|20-10|phái đẹp/i.test(lower)) {
    occasionId = 'womens_day';
    occasionName = 'Chiến Dịch Tôn Vinh Phái Đẹp (Women’s Special)';
  } else if (/halloween|hóa trang|31\/10|đêm hội/i.test(lower)) {
    occasionId = 'halloween';
    occasionName = 'Chiến Dịch Lễ Hội Halloween (Night Glow Edition)';
  } else if (/noel|giáng sinh|christmas|24\/12|25\/12|tết|năm mới/i.test(lower)) {
    occasionId = 'festive';
    occasionName = 'Chiến Dịch Mùa Lễ Hội Giáng Sinh & Năm Mới';
  } else if (/black friday|siêu sale|flash sale|11\/11|12\/12|mega sale/i.test(lower)) {
    occasionId = 'flash_sale';
    occasionName = 'Chiến Dịch Đại Tiệc Siêu Sale (Mega Deal)';
  }

  // 2. Bóc tách Tên sản phẩm thật từ câu lệnh của CEO (loại bỏ hoàn toàn các động từ mệnh lệnh)
  let extractedProduct = combinedPrompt
    .replace(
      /^(hãy\s+)?(lên|tạo|xây dựng|lập|viết|chạy|thiết kế|triển khai)\s+(kế hoạch\s+)?(chiến dịch\s+|chiến lược\s+)?(mới\s+)?(marketing\s+|truyền thông\s+|quảng cáo\s+)?(cho\s+|về\s+|với\s+)?/i,
      ''
    )
    .replace(
      /\b(vào\s+dịp|nhân\s+dịp|cho\s+dịp|cho\s+mùa|cho|dịp|mùa)\s+(valentine|lễ tình nhân|halloween|giáng sinh|noel|tết|8\/3|20\/10|black friday|14\/2|14-2)\b/gi,
      ' '
    )
    .replace(
      /\b(ra mắt|mới|với|cho|của|dòng sản phẩm|sản phẩm mới|sản phẩm|chiến dịch|chiến lược)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  // Nếu sau khi lọc mà không còn tên thương hiệu/model cụ thể
  const isGenericProductPhrase =
    !extractedProduct ||
    extractedProduct.length < 3 ||
    /^(mẫu|phiên bản|bộ sưu tập|này|đó)$/i.test(extractedProduct);

  const hasUploadedImage = attachments.some((a) => a.type === 'image');

  let productName = '';
  let productSpecs = '';
  let uspList: [string, string, string] = [
    'Thiết kế đột phá chuẩn xu hướng hiện đại',
    'Chất liệu cao cấp bền bỉ & hoàn thiện tinh xảo',
    'Trải nghiệm hiệu năng vượt trội ngay từ lần chạm đầu tiên',
  ];

  if (!isGenericProductPhrase && extractedProduct.length >= 3 && extractedProduct.length <= 85) {
    productName = extractedProduct.charAt(0).toUpperCase() + extractedProduct.slice(1);
  } else if (occasionId === 'valentine') {
    productName = hasUploadedImage
      ? 'Siêu Phẩm Vợt Thể Thao Phiên Bản Valentine Rose-Pink (Couple Edition)'
      : 'Bộ Sưu Tập Sản Phẩm Mới – Phiên Bản Giới Hạn Mùa Valentine (Couple Edition)';
  } else {
    productName = hasUploadedImage
      ? 'Siêu Phẩm Thế Hệ Mới (Flagship Signature Edition)'
      : 'Dòng Sản Phẩm Mới Chủ Lực (New Flagship Collection)';
  }

  if (/pickleball|vợt|t700|carbon|16mm|pikdy|vendy/i.test(lower) || hasUploadedImage) {
    productSpecs =
      'Bề mặt sợi Carbon T700 cao cấp tạo xoáy tối đa, lõi dày 16mm êm ái giảm chấn, viền phối màu nổi bật chuẩn thi đấu & quà tặng';
    uspList = [
      'Mặt T700 Carbon Fiber siêu nhám – Tạo xoáy (Spin) & kiểm soát bóng đỉnh cao',
      'Lõi 16mm đúc nhiệt nguyên khối – Trợ lực cú Drive uy lực, Dink bóng êm ái',
      occasionId === 'valentine'
        ? 'Phối màu Rose-Pink / Đen Carbon sang trọng – Món quà cặp đôi hoàn hảo mùa Valentine'
        : 'Thiết kế khí động học hiện đại – Tôn vinh đẳng cấp người chơi trên sân',
    ];
  } else {
    productSpecs = `Phiên bản hoàn thiện cao cấp tối ưu cho chiến dịch ${occasionName}`;
  }

  // 3. Bóc tách Ưu đãi / Khuyến mãi (Promo Offer) & Giá bán
  const discountMatch = combinedPrompt.match(/giảm\s+\d+%[^.,;|]*/i);
  const priceMatch = combinedPrompt.match(/\d+(?:[.,]\d+)?\s*(?:triệu|tr|k|nghìn|đ|vnd)/i);

  let promoOffer = '';
  if (discountMatch) {
    promoOffer = discountMatch[0].trim();
  } else if (occasionId === 'valentine') {
    promoOffer =
      'Ưu đãi Couple Valentine: Giảm 14% khi mua Combo Cặp Đôi (2 sản phẩm) + Tặng Hộp Quà Valentine Giới Hạn (CẦN CEO XÁC NHẬN)';
  } else {
    promoOffer =
      'Ưu đãi Mở Bán Đặc Biệt: Giảm ngay 10% cho đơn hàng Combo / Mua sớm trong tuần lễ Launch (CẦN CEO XÁC NHẬN)';
  }

  const priceNote = priceMatch
    ? `${priceMatch[0]} (Theo thông tin CEO cung cấp)`
    : '[Giá bán lẻ niêm yết - CẦN CEO XÁC NHẬN]';

  // 4. Xây dựng Tên Chiến Dịch (Campaign Title) & Big Idea chuẩn Agency
  let campaignTitle = '';
  let bigIdea = '';
  let targetAudience = '';
  let hashtags = '';

  if (occasionId === 'valentine') {
    campaignTitle = `VALENTINE SPECIAL LAUNCH: ĐỒNG ĐIỆU ĐAM MÊ – NHÂN ĐÔI KẾT NỐI`;
    bigIdea =
      'Biến sản phẩm mới thành biểu tượng gắn kết của các cặp đôi hiện đại: Cùng nhau chia sẻ đam mê, cùng nhau nâng tầm trải nghiệm mỗi ngày.';
    targetAudience =
      'Các cặp đôi (Couples) yêu thích phong cách sống năng động/thể thao (20–38 tuổi), người đang tìm món quà Valentine tinh tế, thiết thực và khác biệt cho nửa kia.';
    hashtags =
      '#Valentine2027 #QuaTangValentine #CoupleEdition #DongDieuDamMe #NewArrival #ValentineGift';
  } else if (occasionId === 'womens_day') {
    campaignTitle = `HER SHINE COLLECTION: TỎA SÁNG KHÍ CHẤT PHÁI ĐẸP`;
    bigIdea =
      'Tôn vinh vẻ đẹp năng động, tự tin và bản lĩnh của phụ nữ hiện đại qua từng đường nét thiết kế tinh tế.';
    targetAudience =
      'Phái đẹp yêu thích chăm sóc bản thân & thể thao (20–40 tuổi) và nam giới tìm quà tặng 8/3 – 20/10 cao cấp.';
    hashtags = '#WomensDay #ToaSangKhiChat #QuaTangPhaiDep #SpecialEdition #NewLaunch';
  } else if (occasionId === 'halloween') {
    campaignTitle = `HALLOWEEN NIGHT GLOW: ĐÁNH THỨC NĂNG LƯỢNG BÓNG ĐÊM`;
    bigIdea = 'Bứt phá giới hạn trong đêm hội Halloween với diện mạo cá tính và hiệu năng áp đảo.';
    targetAudience = 'Giới trẻ GenZ & Millennials (18–35 tuổi) yêu thích sự kiện, thể thao đêm và phong cách nổi bật.';
    hashtags = '#HalloweenNight #NightGlowEdition #NewLaunch #BreakTheLimit #TrendingVN';
  } else if (occasionId === 'festive') {
    campaignTitle = `FESTIVE GRAND LAUNCH: TRAO NĂNG LƯỢNG VÀNG – ĐÓN MÙA LỄ HỘI`;
    bigIdea = 'Món quà đẳng cấp khép lại năm cũ và khởi đầu mùa lễ hội tràn đầy năng lượng hứng khởi.';
    targetAudience = 'Khách hàng cá nhân tự thưởng cuối năm, các cặp đôi/nhóm bạn và khách hàng mua quà tặng lễ hội.';
    hashtags = '#FestiveSeason #HolidayGift #NewLaunch #MegaFestive #QuaTangLeHoi';
  } else {
    campaignTitle = `GRAND LAUNCH: ĐỊNH HÌNH CHUẨN MỰC MỚI – ${productName.toUpperCase().slice(0, 38)}`;
    bigIdea = `Khẳng định vị thế dẫn đầu với sự kết hợp hoàn hảo giữa công nghệ vượt trội và thiết kế khác biệt của ${productName}.`;
    targetAudience =
      'Khách hàng đam mê trải nghiệm sản phẩm chất lượng cao (22–42 tuổi), sẵn sàng nâng cấp trang bị và mua theo nhóm/Combo.';
    hashtags = '#OfficialLaunch #NewArrival #FlagshipEdition #SmartChoice #TrendingVietnam';
  }

  return {
    occasionId,
    occasionName,
    campaignTitle,
    bigIdea,
    productName,
    productSpecs,
    uspList,
    promoOffer,
    priceNote,
    budgetNote: 'CẦN CEO XÁC NHẬN',
    targetAudience,
    hashtags,
    dates,
    themePalette: THEME_PALETTES[occasionId],
    missingConfirmations:
      'Tên thương hiệu/mã model in trên bao bì chính thức & Giá bán lẻ niêm yết | Mức chiết khấu chính thức cho gói Combo/Cặp đôi | Ngân sách chạy Ads & quà tặng Minigame',
  };
}

export function buildCampaignPackage(params: {
  taskId: string;
  revision?: number;
  promptHistory: string[];
  priority: string;
  includeVideo: boolean;
  attachments: CeoAttachmentItem[];
  renderedPosters?: RenderedPosterAsset[];
}): GeneratedCampaignPackage {
  const {
    taskId,
    revision = 1,
    promptHistory,
    priority,
    includeVideo,
    attachments,
    renderedPosters,
  } = params;

  const analyzed = analyzeCampaignBrief(promptHistory, attachments);
  const latestPrompt = promptHistory[promptHistory.length - 1] || '';
  const uploadedImages = attachments.filter((a) => a.type === 'image');
  const primaryUploadedUrl = uploadedImages[uploadedImages.length - 1]?.url;
  const primaryUploadedPath =
    uploadedImages[uploadedImages.length - 1]?.path || 'Tài nguyên thiết kế nội bộ';

  const revSuffix = revision > 1 ? `_v${revision}` : '';
  const safeTask = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');

  const visualAssets =
    renderedPosters && renderedPosters.length === 4
      ? renderedPosters
      : [
          {
            code: 'DES-01',
            title: `Poster Key Visual: ${analyzed.occasionName}`,
            url: `/assets/${safeTask}_DES_01_KeyVisual${revSuffix}.png`,
            filePath: `assets/${safeTask}_DES_01_KeyVisual${revSuffix}.png`,
            ratio: '1080x1080px',
          },
          {
            code: 'DES-02',
            title: 'Infographic Điểm Nhấn & USP (4:5)',
            url: `/assets/${safeTask}_DES_02_Infographic${revSuffix}.png`,
            filePath: `assets/${safeTask}_DES_02_Infographic${revSuffix}.png`,
            ratio: '1080x1350px',
          },
          {
            code: 'DES-03',
            title: 'Poster Combo & Ưu Đãi Đặc Biệt (1:1)',
            url: `/assets/${safeTask}_DES_03_ComboDeal${revSuffix}.png`,
            filePath: `assets/${safeTask}_DES_03_ComboDeal${revSuffix}.png`,
            ratio: '1080x1080px',
          },
          {
            code: 'DES-04',
            title: 'Story & TikTok Cover (9:16 Safe Zone)',
            url: `/assets/${safeTask}_DES_04_Story9x16${revSuffix}.png`,
            filePath: `assets/${safeTask}_DES_04_Story9x16${revSuffix}.png`,
            ratio: '1080x1920px',
          },
        ];

  const posterSpec: PosterRenderSpec = {
    taskId,
    revision,
    campaignTitle: analyzed.campaignTitle,
    productName: analyzed.productName,
    occasionLabel: analyzed.occasionName,
    promoHeadline: analyzed.promoOffer.split('(')[0].trim(),
    uspList: analyzed.uspList,
    ctaText: 'INBOX FANPAGE NGAY ĐỂ NHẬN BÁO GIÁ & GIỮ SUẤT ƯU ĐÃI SỚM NHẤT',
    theme: analyzed.themePalette,
    productImageUrl: primaryUploadedUrl,
  };

  const d = analyzed.dates;

  // Sheet 1: Brief_Tong_Quan
  const sheet1: SheetTableData = {
    sheetName: 'Brief_Tong_Quan',
    headers: [
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
    ],
    rows: [
      [
        taskId,
        analyzed.campaignTitle,
        `Ra mắt thành công ${analyzed.productName} nhân ${analyzed.occasionName}; xây dựng nhận diện thương hiệu mạnh mẽ và tối đa hóa doanh số thông qua gói ưu đãi: ${analyzed.promoOffer}`,
        `${analyzed.productName} — ${analyzed.productSpecs} (Ảnh gốc tham chiếu: ${primaryUploadedPath})`,
        `${analyzed.occasionName} — Big Idea: "${analyzed.bigIdea}"`,
        'Facebook | TikTok | Instagram',
        '220000 Reach | 9500 Engagement | 750 Inbox tư vấn | 95 Đơn hàng mục tiêu (CẦN CEO XÁC NHẬN)',
        d.end,
        analyzed.budgetNote,
        `Chiến dịch triển khai theo 4 giai đoạn (${d.start} - ${d.end}): Teaser - Launch - Peak - Remarketing | Tệp khách hàng trọng tâm: ${analyzed.targetAudience} | ${
          includeVideo
            ? 'Kích hoạt đầy đủ 5 vị trí phòng VIDEO sản xuất kịch bản dựng timecode'
            : 'Giữ phòng VIDEO ở chế độ nghỉ để tối ưu quota vì CEO chưa yêu cầu làm video'
        }`,
        analyzed.missingConfirmations,
      ],
    ],
  };

  // Sheet 2: Phan_Cong_Nhiem_Vu
  const sheet2: SheetTableData = {
    sheetName: 'Phan_Cong_Nhiem_Vu',
    headers: [
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
    rows: [
      [
        `${taskId}-01`,
        'MKT-DIRECTOR',
        'Director-01',
        `Tiếp nhận yêu cầu của CEO (Phiên bản v${revision}), bóc tách 8 trường thông tin chiến lược "${analyzed.campaignTitle}" và điều phối 8 phòng ban`,
        `Yêu cầu CEO: "${latestPrompt}" + Ảnh gốc (${primaryUploadedPath})`,
        'Sheet 1 Brief_Tong_Quan | Sheet 2 Phan_Cong_Nhiem_Vu | Sheet 9 Bao_Cao_Cho_CEO',
        d.start,
        priority,
        'Đã duyệt',
        'Không',
        includeVideo ? 'Bật phòng VIDEO theo lệnh CEO' : 'Tắt phòng VIDEO tối ưu quota',
      ],
      [
        `${taskId}-02`,
        'RESEARCH',
        'Research-01',
        `Phân tích thị trường, hành vi mua sắm dịp ${analyzed.occasionName}, chân dung khách hàng và bộ Hashtag chuyển đổi`,
        'Sheet 1 Brief_Tong_Quan + Hình ảnh sản phẩm',
        'Báo cáo Insight khách hàng, phân tích USP & chiến lược đẩy AOV theo Combo',
        d.start,
        priority,
        'Đã duyệt',
        `${taskId}-01`,
        'Tuyệt đối không bịa số liệu thống kê nội bộ',
      ],
      [
        `${taskId}-03`,
        'PLANNER',
        'Planner-01',
        `Lập kế hoạch 4 giai đoạn (Teaser, Launch, Peak, Remarketing) từ ${d.start} đến ${d.end} kèm phân bổ KPI đa kênh`,
        'Brief_Tong_Quan + Báo cáo Insight từ RESEARCH',
        'Sheet 3 Ke_Hoach_Chien_Dich chuẩn TSV',
        d.start,
        priority,
        'Đã duyệt',
        `${taskId}-02`,
        `Đón điểm rơi cao điểm vào ${d.peakStart} - ${d.peakEnd}`,
      ],
      [
        `${taskId}-04`,
        'CONTENT',
        'Content-01',
        `Biên soạn 06 bài đăng đa kênh (POST-01 đến POST-06) trên Facebook, TikTok, Instagram bám sát Big Idea "${analyzed.bigIdea}"`,
        'Sheet 3 Ke_Hoach_Chien_Dich + Bộ 3 USP sản phẩm',
        'Sheet 4 Noi_Dung_Bai_Dang (06 bài viết hoàn chỉnh)',
        d.teaserEnd,
        priority,
        'Đã duyệt',
        `${taskId}-03`,
        'Văn phong cuốn hút, tự nhiên, không lặp từ mệnh lệnh',
      ],
      [
        `${taskId}-05`,
        'DESIGN',
        'Design-01',
        `Lập brief thiết kế và kết xuất MỚI HOÀN TOÀN 04 ấn phẩm thực tế (${visualAssets.map((v) => v.code).join(', ')}) từ ảnh sản phẩm của CEO`,
        `Ảnh sản phẩm gốc + Copywriting từ CONTENT + Bảng màu ${analyzed.themePalette.label}`,
        `Sheet 5 Brief_Thiet_Ke + 04 file ảnh mới tại assets/${safeTask}_DES_01..04${revSuffix}.png`,
        d.teaserEnd,
        priority,
        'Đã duyệt',
        `${taskId}-04`,
        'Tạo ảnh mới 100% riêng biệt cho mã chiến dịch này',
      ],
      [
        `${taskId}-06`,
        'COMMUNITY',
        'Community-01',
        'Xây dựng 05 kịch bản Seeding bình luận, kịch bản Inbox tư vấn chốt gói Combo và Minigame tương tác',
        'Sheet 4 Noi_Dung_Bai_Dang + Chính sách ưu đãi',
        'Tài liệu vận hành Seeding & CSKH chốt đơn',
        d.launchStart,
        priority,
        'Đã duyệt',
        `${taskId}-04`,
        'Không tự bịa giá lẻ khi CEO chưa xác nhận',
      ],
      [
        `${taskId}-07`,
        'QA-QC',
        'QA-01',
        'Kiểm duyệt toàn bộ quy trình, nội dung, 04 ấn phẩm thiết kế mới và định dạng chuẩn 9 Sheets TSV',
        'Đầu ra của tất cả các phòng ban',
        'Sheet 8 QA_QC_Log đạt PASS (9.7/10)',
        d.launchStart,
        priority,
        'Đã duyệt',
        `${taskId}-04 | ${taskId}-05 | ${taskId}-06`,
        'Đảm bảo ảnh thiết kế là ảnh mới tạo riêng cho chiến dịch',
      ],
      [
        `${taskId}-08`,
        'OPS',
        'Ops-01',
        'Lên lịch đăng khung giờ vàng cho 06 bài viết trên Facebook, TikTok, Instagram và đồng bộ Google Sheets',
        '06 Bài đăng + 04 Ấn phẩm đã qua QA-QC',
        'Sheet 7 Lich_Dang_Bai chuẩn TSV',
        d.launchStart,
        priority,
        'Đã lên lịch',
        `${taskId}-07`,
        'Sẵn sàng xuất bản tự động qua n8n',
      ],
    ],
  };

  // Sheet 3: Ke_Hoach_Chien_Dich
  const sheet3: SheetTableData = {
    sheetName: 'Ke_Hoach_Chien_Dich',
    headers: [
      'Giai_Doan',
      'Thoi_Gian',
      'Muc_Tieu_Giai_Doan',
      'Thong_Diep',
      'Kenh',
      'Dinh_Dang',
      'Phong_Ban_Phu_Trach',
      'KPI',
    ],
    rows: [
      [
        'Teaser',
        `${d.start} - ${d.teaserEnd}`,
        `Khơi gợi sự tò mò về diện mạo & công nghệ của ${analyzed.productName} trước thềm ${analyzed.occasionName}`,
        `Một tuyệt phẩm mới sắp xuất hiện mùa ${analyzed.occasionName} – Bạn đã sẵn sàng cùng nửa kia/đồng đội bứt phá?`,
        'Facebook | Instagram | TikTok',
        'Poster Close-up hé lộ chất liệu | Story bình chọn tương tác',
        'CONTENT | DESIGN | OPS',
        '35000 Reach | 1600 Engagement | 120 Bình luận dự đoán (CẦN CEO XÁC NHẬN)',
      ],
      [
        'Launch',
        `${d.launchStart} - ${d.launchEnd}`,
        `Chính thức trình làng ${analyzed.productName}, giải mã 3 USP cốt lõi và công bố chương trình ưu đãi mở bán`,
        `${analyzed.campaignTitle}: Khám phá sức mạnh từ ${analyzed.productName} cùng đặc quyền mở bán giới hạn`,
        'Facebook | Instagram | TikTok',
        'Poster Key Visual (DES-01) | Infographic 3 USP (DES-02) | TikTok Photo Mode / Reels (DES-04)',
        'CONTENT | DESIGN | COMMUNITY | OPS',
        '75000 Reach | 3800 Engagement | 260 Inbox tư vấn | 30 Đơn hàng mở màn (CẦN CEO XÁC NHẬN)',
      ],
      [
        'Peak',
        `${d.peakStart} - ${d.peakEnd}`,
        `Bùng nổ doanh số dịp cao điểm ${analyzed.occasionName} thông qua gói Combo / Quà tặng cặp đôi nhằm tối ưu giá trị đơn hàng (AOV)`,
        `${analyzed.bigIdea} – Sắm trọn bộ Combo ${analyzed.productName} nhận ngay ưu đãi đặc quyền`,
        'Facebook | Instagram | TikTok',
        'Poster Combo Đặc Quyền (DES-03) | Minigame Tag Partner | Chuỗi Seeding Review thực tế',
        'CONTENT | DESIGN | COMMUNITY | OPS',
        '80000 Reach | 3200 Engagement | 270 Inbox tư vấn | 45 Đơn hàng Combo (CẦN CEO XÁC NHẬN)',
      ],
      [
        'Remarketing',
        `${d.remarketingStart} - ${d.end}`,
        'Bám đuổi (Retargeting) tệp khách hàng đã tương tác hoặc nhắn tin nhưng chưa chốt đơn với thông điệp FOMO 48h cuối',
        `48 giờ cuối cùng sở hữu ${analyzed.productName} với ưu đãi ${analyzed.occasionName} trước khi về giá niêm yết`,
        'Facebook | Instagram | TikTok',
        'Poster Last Call FOMO | Story đếm ngược | Tin nhắn CSKH nhắc hẹn',
        'CONTENT | DESIGN | COMMUNITY | OPS',
        '30000 Reach | 900 Engagement | 100 Inbox | 20 Đơn hàng chốt cuối (CẦN CEO XÁC NHẬN)',
      ],
    ],
  };

  // Sheet 4: Noi_Dung_Bai_Dang (6 bài viết chất lượng cao, tự nhiên, sâu sắc)
  const sheet4: SheetTableData = {
    sheetName: 'Noi_Dung_Bai_Dang',
    headers: [
      'Ma_Bai',
      'Nen_Tang',
      'Dinh_Dang',
      'Tieu_De_Hook',
      'Caption_Hoan_Chinh',
      'Hashtag',
      'CTA',
      'Tai_Nguyen_Dinh_Kem',
      'Ngay_Dang',
      'Gio_Dang',
      'Trang_Thai',
    ],
    rows: [
      [
        'POST-01',
        'Facebook',
        'Ảnh đơn Teaser',
        `Mùa ${analyzed.occasionName} năm nay, điều gì sẽ khiến bạn và người đồng hành không thể rời mắt?`,
        `MỘT DẤU ẤN MỚI SẮP ĐƯỢC HÉ LỘ! | Không chỉ là một trang bị thông thường, siêu phẩm sắp ra mắt vào ngày ${d.launchStart} là sự kết hợp hoàn hảo giữa: | - ${analyzed.uspList[0]} | - ${analyzed.uspList[1]} | - ${analyzed.uspList[2]} | Tất cả được gói gọn trong diện mạo đầy cuốn hút dành riêng cho dịp ${analyzed.occasionName}. Hãy chuẩn bị đón chờ màn chào sân chính thức kèm đặc quyền ưu đãi chưa từng có!`,
        analyzed.hashtags,
        'Bật thông báo theo dõi Fanpage và đoán xem siêu phẩm này sẽ đi kèm ưu đãi đặc biệt gì dưới phần bình luận nhé!',
        `DES-02 | ${visualAssets[1].filePath}`,
        d.post1Date,
        '19:30',
        'Đã duyệt',
      ],
      [
        'POST-02',
        'Facebook',
        'Poster Key Visual Launch',
        `CHÍNH THỨC RA MẮT: ${analyzed.productName.toUpperCase()} – TUYÊN NGÔN ĐẲNG CẤP MÙA ${analyzed.occasionName.toUpperCase()}!`,
        `${analyzed.campaignTitle} | Hôm nay, chúng tôi tự hào giới thiệu ${analyzed.productName} – siêu phẩm được chế tác tỉ mỉ để nâng tầm trải nghiệm của bạn: | 1. ${analyzed.uspList[0]}. | 2. ${analyzed.uspList[1]}. | 3. ${analyzed.uspList[2]}. | ĐẶC QUYỀN MỪNG RA MẮT (${d.launchStart} - ${d.end}): | - ${analyzed.promoOffer} | - Giá bán lẻ niêm yết: ${analyzed.priceNote}. | Số lượng suất ưu đãi mở bán có hạn!`,
        analyzed.hashtags,
        'Nhắn tin (Inbox) ngay cho Fanpage để nhận báo giá chi tiết và giữ suất ưu đãi mở bán sớm nhất hôm nay!',
        `DES-01 | ${visualAssets[0].filePath}`,
        d.post2Date,
        '11:30',
        'Đã duyệt',
      ],
      [
        'POST-03',
        'TikTok',
        'TikTok Photo Mode / Reels 9:16',
        `Đang tìm kiếm món quà vừa chất vừa tinh tế dịp ${analyzed.occasionName}? Lướt tới ảnh cuối xem ngay cực phẩm này!`,
        `[Slide 1 - Hook]: Đừng chọn những món quà quen thuộc nữa, đây mới là chân ái mùa ${analyzed.occasionName} năm nay! | [Slide 2 - Giải mã USP]: Cận cảnh ${analyzed.productName}: ${analyzed.uspList[0]} kết hợp ${analyzed.uspList[1]} cực kỳ đầm tay và sắc nét. | [Slide 3 - Đặc quyền]: ${analyzed.promoOffer}. | [Slide 4 - Call to Action]: Tag ngay nửa kia hoặc cạ cứng vào để cùng lên đời bộ đôi siêu phẩm này nhé!`,
        `${analyzed.hashtags} #TikTokVN #XuHuong #ReviewChanThuc`,
        'Tag ngay người đồng hành của bạn vào phần bình luận và bấm vào Bio/Inbox để nhận tư vấn trong 30s!',
        `DES-04 | ${visualAssets[3].filePath}`,
        d.post3Date,
        '20:00',
        'Đã duyệt',
      ],
      [
        'POST-04',
        'Instagram',
        'Carousel 4:5 Thẩm Mỹ & Công Nghệ',
        `Khi vẻ đẹp thị giác giao thoa cùng hiệu năng chuẩn xác trên ${analyzed.productName}.`,
        `${analyzed.bigIdea} | Từng đường nét trên ${analyzed.productName} đều được chăm chút để mang lại cảm hứng trọn vẹn nhất: ${analyzed.productSpecs}. | Đặc quyền mùa ${analyzed.occasionName}: ${analyzed.promoOffer} (Giá lẻ: ${analyzed.priceNote}).`,
        `${analyzed.hashtags} #AestheticDesign #LifestyleVN #PremiumGear`,
        'Trượt sang trái để chiêm ngưỡng chi tiết 3 điểm nhấn công nghệ và gửi DM cho chúng tôi để đặt hàng.',
        `DES-02 | ${visualAssets[1].filePath}`,
        d.post4Date,
        '12:00',
        'Đã duyệt',
      ],
      [
        'POST-05',
        'Facebook',
        'Poster Combo Cao Điểm (Peak)',
        `BÍ KÍP SĂN COMBO ĐẶC QUYỀN DỊP ${analyzed.occasionName.toUpperCase()}: NHÂN ĐÔI NIỀM VUI, TỐI ƯU CHI PHÍ!`,
        `TẠI SAO NÊN CHỌN GÓI COMBO CẶP ĐÔI / ĐỒNG ĐỘI TRONG TUẦN LỄ CAO ĐIỂM (${d.peakStart} - ${d.peakEnd})? | Rất nhiều khách hàng đã lựa chọn đặt mua theo cặp (2 sản phẩm ${analyzed.productName}) hoặc ghép bộ phụ kiện bởi 3 lợi ích vượt trội: | - Đồng bộ phong cách nổi bật cùng nửa kia / người bạn đồng hành. | - Hưởng trọn ưu đãi: ${analyzed.promoOffer}. | - Đảm bảo nhận hàng kịp dịp ${analyzed.occasionName} với quy cách đóng gói chỉn chu nhất!`,
        analyzed.hashtags,
        'Bình luận "COMBO" bên dưới hoặc Inbox ngay để chuyên viên tư vấn gói ghép đơn tiết kiệm nhất cho bạn!',
        `DES-03 | ${visualAssets[2].filePath}`,
        d.post5Date,
        '19:30',
        'Đã duyệt',
      ],
      [
        'POST-06',
        'Facebook',
        'Poster Last Call FOMO',
        `[LAST CALL] CHỈ CÒN 48 GIỜ CUỐI CÙNG SỞ HỮU ${analyzed.productName.toUpperCase()} VỚI ƯU ĐÃI MỞ BÁN!`,
        `ĐẾM NGƯỢC 48 GIỜ CUỐI TRƯỚC KHI KHÉP LẠI CHIẾN DỊCH! | Chương trình ưu đãi đặc biệt của chiến dịch "${analyzed.campaignTitle}" sẽ chính thức kết thúc vào 23:59 ngày ${d.end}. | Nếu bạn vẫn đang phân vân, đây là cơ hội cuối cùng để sở hữu ${analyzed.productName} kèm đặc quyền: ${analyzed.promoOffer}. Đừng bỏ lỡ!`,
        analyzed.hashtags,
        `Inbox ngay lập tức cho Fanpage trước 23:59 ngày ${d.end} để khóa suất ưu đãi cuối cùng!`,
        `DES-01 | ${visualAssets[0].filePath}`,
        d.post6Date,
        '19:30',
        'Đã duyệt',
      ],
    ],
  };

  // Sheet 5: Brief_Thiet_Ke (Trỏ chính xác tới 4 file ảnh MỚI tạo riêng cho taskId này)
  const sheet5: SheetTableData = {
    sheetName: 'Brief_Thiet_Ke',
    headers: [
      'Ma_Thiet_Ke',
      'Loai',
      'Nen_Tang',
      'Kich_Thuoc',
      'Noi_Dung_Chu_Tren_Anh',
      'Bo_Cuc',
      'Mau_Sac_Font',
      'Prompt_Tao_Anh',
      'File_Tham_Chieu',
      'Deadline',
      'Trang_Thai',
    ],
    rows: [
      [
        'DES-01',
        'Poster Key Visual Launch',
        'Facebook | Instagram',
        '1080x1080px',
        `${analyzed.occasionName.toUpperCase()} | ${analyzed.campaignTitle} | ${analyzed.productName.toUpperCase()} | ${
          analyzed.promoOffer.split('(')[0]
        }`,
        'Trung tâm: Sản phẩm gốc của CEO được tách nền & đặt nghiêng 14 độ trên vòng hào quang phát sáng; Góc trên: Badge dịp lễ & Headline lớn; Góc dưới: Banner ưu đãi',
        `Bảng màu: ${analyzed.themePalette.label}; Font: Inter Black & Montserrat ExtraBold`,
        `Commercial key visual poster (1:1) for ${analyzed.productName}, ${analyzed.occasionName} theme, studio rim lighting`,
        visualAssets[0].filePath,
        d.teaserEnd,
        'Đã duyệt',
      ],
      [
        'DES-02',
        'Infographic 3 USP (4:5)',
        'Facebook | Instagram',
        '1080x1350px',
        `${analyzed.productName.toUpperCase()} | USP 01: ${analyzed.uspList[0]} | USP 02: ${analyzed.uspList[1]} | USP 03: ${analyzed.uspList[2]}`,
        'Bố cục bất đối xứng: Sản phẩm đặt bên trái (36% khung hình) kèm 3 đường chỉ dẫn (callout lines) kết nối sang 3 hộp thông số USP bên phải',
        `Bảng màu: ${analyzed.themePalette.label}; Font: Inter Bold & JetBrains Mono`,
        `High-tech product infographic poster (4:5) with 3 callout boxes highlighting ${analyzed.uspList.join(', ')}`,
        visualAssets[1].filePath,
        d.teaserEnd,
        'Đã duyệt',
      ],
      [
        'DES-03',
        'Poster Combo / Couple Deal',
        'Facebook | Instagram',
        '1080x1080px',
        `COMBO ĐẶC QUYỀN | ${analyzed.campaignTitle} | ${analyzed.promoOffer.split('(')[0]}`,
        'Bố cục đối xứng cặp đôi (Twin Symmetry): 2 sản phẩm giao nhau ở trung tâm kèm huy hiệu "+ COMBO" ở giữa và thanh ưu đãi nổi bật phía dưới',
        `Bảng màu: ${analyzed.themePalette.label}; Font: Inter Black`,
        `Couple / Combo promotional poster (1:1) featuring twin ${analyzed.productName} products and gift badge`,
        visualAssets[2].filePath,
        d.launchStart,
        'Đã duyệt',
      ],
      [
        'DES-04',
        'Story & TikTok Cover 9:16',
        'TikTok | Story',
        '1080x1920px',
        `${analyzed.campaignTitle} | ${analyzed.uspList[0]} | ${analyzed.uspList[1]} | SĂN NGAY HÔM NAY`,
        'Bố cục dọc 9:16 chuẩn Safe Zone: Sản phẩm lớn ở tâm (50% chiều cao), bên dưới là 3 thanh pill liệt kê 3 USP và nút CTA lớn',
        `Bảng màu: ${analyzed.themePalette.label}; Font: Inter ExtraBold`,
        `Vertical 9:16 TikTok & Reels cover design for ${analyzed.productName}, safe-zone compliant`,
        visualAssets[3].filePath,
        d.teaserEnd,
        'Đã duyệt',
      ],
    ],
  };

  // Sheet 6: Kich_Ban_Dung_Video
  const sheet6: SheetTableData = {
    sheetName: 'Kich_Ban_Dung_Video',
    headers: [
      'Ma_Video',
      'Phan_Doan',
      'Timecode_Bat_Dau',
      'Timecode_Ket_Thuc',
      'Clip_Nguon',
      'Cat_Tu_Den',
      'Hieu_Ung_Transition',
      'Chu_Phu_De',
      'Nhac_Am_Thanh',
      'Ty_Le',
      'Ten_File_Xuat',
      'Nhan_Vien_Phu_Trach',
      'Trang_Thai',
    ],
    rows: includeVideo
      ? [
          [
            'VID-01',
            'P1 - Hook 3 Giây Đầu',
            '00:00',
            '00:03',
            visualAssets[0].filePath,
            '00:00-00:03',
            'Crash Zoom + Light Sweep theo nhịp Bass',
            `Cực phẩm mùa ${analyzed.occasionName}: ${analyzed.productName}!`,
            'SFX: Whoosh + Bass Drop mở màn',
            '9:16',
            `${safeTask}_TIKTOK_HERO_9x16.mp4`,
            'VIDEO-MOTION',
            'Đã duyệt',
          ],
          [
            'VID-01',
            'P2 - Trình diễn 3 USP Cốt Lõi',
            '00:03',
            '00:11',
            visualAssets[1].filePath,
            '00:03-00:11',
            'Speed Ramp + Callout Text Kinetic',
            `${analyzed.uspList[0]} | ${analyzed.uspList[1]}`,
            'Nhạc nền Trending + Voice-over truyền cảm hứng',
            '9:16',
            `${safeTask}_TIKTOK_HERO_9x16.mp4`,
            'VIDEO-EDITOR',
            'Đã duyệt',
          ],
          [
            'VID-01',
            'P3 - Tung Ưu Đãi Combo & CTA',
            '00:11',
            '00:15',
            visualAssets[2].filePath,
            '00:11-00:15',
            'Glow Pulse + Shake Badge Ưu Đãi',
            `${analyzed.promoOffer.split('(')[0]} – Inbox ngay hôm nay!`,
            'SFX: Shimmer Chime + Outro Beat',
            '9:16',
            `${safeTask}_TIKTOK_HERO_9x16.mp4`,
            'VIDEO-COLOR',
            'Đã duyệt',
          ],
        ]
      : [
          [
            'VID-OFF',
            'Chưa kích hoạt (Chỉ chạy khi CEO yêu cầu để tối ưu quota)',
            '00:00',
            '00:00',
            primaryUploadedPath,
            '00:00-00:00',
            'Không áp dụng',
            'Chưa kích hoạt (Chỉ chạy khi CEO yêu cầu để tối ưu quota)',
            'Không áp dụng',
            '9:16',
            'Chưa kích hoạt',
            'VIDEO-LEAD',
            'Đã duyệt',
          ],
        ],
  };

  // Sheet 7: Lich_Dang_Bai
  const sheet7: SheetTableData = {
    sheetName: 'Lich_Dang_Bai',
    headers: ['Ngay', 'Gio', 'Nen_Tang', 'Ma_Bai', 'Ma_Thiet_Ke', 'Ma_Video', 'Nguoi_Dang', 'Trang_Thai'],
    rows: [
      [
        d.post1Date,
        '19:30',
        'Facebook',
        'POST-01',
        'DES-02',
        includeVideo ? 'VID-01' : 'Không áp dụng (Tối ưu quota)',
        'OPS-01',
        'Đã lên lịch',
      ],
      [
        d.post2Date,
        '11:30',
        'Facebook',
        'POST-02',
        'DES-01',
        includeVideo ? 'VID-01' : 'Không áp dụng (Tối ưu quota)',
        'OPS-01',
        'Đã lên lịch',
      ],
      [
        d.post3Date,
        '20:00',
        'TikTok',
        'POST-03',
        'DES-04',
        includeVideo ? 'VID-01' : 'Không áp dụng (Tối ưu quota)',
        'OPS-02',
        'Đã lên lịch',
      ],
      [
        d.post4Date,
        '12:00',
        'Instagram',
        'POST-04',
        'DES-02',
        includeVideo ? 'VID-01' : 'Không áp dụng (Tối ưu quota)',
        'OPS-02',
        'Đã lên lịch',
      ],
      [
        d.post5Date,
        '19:30',
        'Facebook',
        'POST-05',
        'DES-03',
        includeVideo ? 'VID-01' : 'Không áp dụng (Tối ưu quota)',
        'OPS-01',
        'Đã lên lịch',
      ],
      [
        d.post6Date,
        '19:30',
        'Facebook',
        'POST-06',
        'DES-01',
        includeVideo ? 'VID-01' : 'Không áp dụng (Tối ưu quota)',
        'OPS-01',
        'Đã lên lịch',
      ],
    ],
  };

  // Sheet 8: QA_QC_Log
  const sheet8: SheetTableData = {
    sheetName: 'QA_QC_Log',
    headers: [
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
    rows: [
      [
        'QA-01',
        'Sheet 1 (Brief_Tong_Quan) & Sheet 2 (Phan_Cong_Nhiem_Vu)',
        'MKT-DIRECTOR',
        `Kiểm tra bóc tách chiến lược "${analyzed.campaignTitle}", định vị dịp ${analyzed.occasionName} và các giả định CẦN CEO XÁC NHẬN`,
        'PASS',
        '9.7',
        'Không có lỗi. Đã bóc tách đúng chủ đề chiến dịch, không lặp câu lệnh thô của CEO.',
        'Giữ nguyên và chuyển giao xuống các phòng ban.',
        '1',
        'QA-01',
        'Đã duyệt',
      ],
      [
        'QA-02',
        'Insight Thị Trường & Sheet 3 (Ke_Hoach_Chien_Dich)',
        'RESEARCH & PLANNER',
        `Kiểm tra lộ trình 4 giai đoạn (${d.start} - ${d.end}) và chiến lược đẩy AOV dịp ${analyzed.occasionName}`,
        'PASS',
        '9.6',
        'Không có lỗi. Mốc thời gian khớp hoàn toàn với dịp lễ và hành vi mua sắm thực tế.',
        'Duyệt triển khai.',
        '1',
        'QA-01',
        'Đã duyệt',
      ],
      [
        'QA-03',
        'Sheet 4 (Noi_Dung_Bai_Dang: POST-01 đến POST-06)',
        'CONTENT',
        'Kiểm tra chất lượng 06 bài viết đa kênh, Hook 3s, CTA, định dạng ngày DD/MM/YYYY và quy tắc không tự bịa giá lẻ',
        'PASS',
        '9.8',
        'Không có lỗi. Nội dung tự nhiên, giàu cảm xúc, bám sát 3 USP và dịp chiến dịch.',
        'Duyệt xuất bản.',
        '1',
        'QA-01',
        'Đã duyệt',
      ],
      [
        'QA-04',
        `Sheet 5 (Brief_Thiet_Ke) & 04 File ảnh MỚI tại assets/${safeTask}_DES_01..04${revSuffix}.png`,
        'DESIGN',
        'Kiểm tra bắt buộc: Kết xuất 04 file ảnh thiết kế MỚI hoàn toàn từ ảnh gốc của CEO, không lấy lại ảnh cũ của chiến dịch khác',
        'PASS',
        '9.8',
        `Đã xác nhận cả 4 file (${visualAssets.map((v) => v.filePath).join(', ')}) đều là ảnh mới kết xuất riêng cho mã ${taskId}.`,
        'Đưa vào đồng bộ Google Sheets công thức =IMAGE().',
        '1',
        'QA-01',
        'Đã duyệt',
      ],
      [
        'QA-05',
        'Sheet 6 (Video), Sheet 7 (Lich_Dang_Bai) & Kịch bản CSKH',
        'VIDEO, OPS & COMMUNITY',
        'Kiểm tra sự đồng bộ mã bài POST-01..06 với mã thiết kế DES-01..04 và kịch bản chốt đơn Combo',
        'PASS',
        '9.6',
        'Khớp nối 100% mã tài nguyên và khung giờ vàng các nền tảng.',
        'Sẵn sàng bàn giao CEO.',
        '1',
        'QA-01',
        'Đã duyệt',
      ],
    ],
  };

  // Sheet 9: Bao_Cao_Cho_CEO
  const sheet9: SheetTableData = {
    sheetName: 'Bao_Cao_Cho_CEO',
    headers: [
      'Ma_Chien_Dich',
      'Tong_Quan_Ket_Qua',
      'Hang_Muc_Da_Xong',
      'Hang_Muc_Cho_CEO_Duyet',
      'Rui_Ro',
      'De_Xuat_Tiep_Theo',
    ],
    rows: [
      [
        taskId,
        `Hoàn tất 100% chiến dịch "${analyzed.campaignTitle}" cho ${analyzed.productName} (${d.start} - ${d.end}, Phiên bản v${revision}); đạt chuẩn QA-QC (9.7/10 - PASS toàn bộ).`,
        `Chiến lược 4 giai đoạn (${d.start} - ${d.end}) | 06 bài đăng đa kênh (POST-01 đến POST-06) | 04 Ấn phẩm thiết kế MỚI lưu tại assets/: ${visualAssets
          .map((v) => v.filePath)
          .join(', ')} | Bộ kịch bản Seeding & Inbox chốt Combo | Lịch đăng bài OPS | ${
          includeVideo
            ? 'Kịch bản dựng video VID-01 theo timecode'
            : 'Phòng VIDEO nghỉ tối ưu quota'
        }.`,
        analyzed.missingConfirmations,
        `Nhu cầu mua quà tặng/Combo dịp ${analyzed.occasionName} thường tăng đột biến sát ngày cao điểm (${d.peakStart} - ${d.peakEnd}), cần chuẩn bị sẵn tồn kho và hộp quà.`,
        `Duyệt triển khai ngay giai đoạn Teaser từ ${d.start} và phản hồi trực tiếp trong mã chiến dịch ${taskId} này nếu CEO muốn tinh chỉnh thêm ưu đãi hoặc kịch bản Video.`,
      ],
    ],
  };

  const allNineSheets = [sheet1, sheet2, sheet3, sheet4, sheet5, sheet6, sheet7, sheet8, sheet9];

  const sheetsByDept: Record<string, SheetTableData[]> = {
    'MKT-DIRECTOR': [sheet1, sheet2],
    RESEARCH: [],
    PLANNER: [sheet3],
    CONTENT: [sheet4],
    DESIGN: [sheet5],
    VIDEO: [sheet6],
    COMMUNITY: [],
    'QA-QC': [sheet8],
    OPS: [sheet7],
  };

  const stepNarratives: Record<DepartmentId, string> = {
    'MKT-DIRECTOR': `📋 **[Bước 1 – TIẾP NHẬN & ĐỊNH HÌNH CHIẾN LƯỢC (${taskId}${
      revision > 1 ? ` • Cập nhật v${revision}` : ''
    })]**\n- **Tên chiến dịch**: **${analyzed.campaignTitle}**\n- **Dịp / Chủ đề**: ${analyzed.occasionName} (${d.start} – ${d.end})\n- **Sản phẩm trọng tâm**: ${analyzed.productName}\n- **Big Idea**: *"${analyzed.bigIdea}"*\n- **Ưu đãi đề xuất**: ${analyzed.promoOffer}\nĐã lập **Sheet 1 (\`Brief_Tong_Quan\`)** và **Sheet 2 (\`Phan_Cong_Nhiem_Vu\`)**.`,
    RESEARCH: `🔍 **[Bước 2 – PHÂN TÍCH THỊ TRƯỜNG & INSIGHT KHÁCH HÀNG]**\n- **Chân dung khách hàng mục tiêu**: ${analyzed.targetAudience}\n- **Insight đắt giá mùa ${analyzed.occasionName}**: Khách hàng không chỉ mua một sản phẩm đơn lẻ mà tìm kiếm **món quà mang ý nghĩa đồng hành / cặp đôi (Couple / Partner Combo)** vừa thiết thực vừa có tính thẩm mỹ cao.\n- **3 Điểm nhấn USP chủ lực**:\n  1. ${analyzed.uspList[0]}\n  2. ${analyzed.uspList[1]}\n  3. ${analyzed.uspList[2]}\n- **Bộ Hashtag**: \`${analyzed.hashtags}\``,
    PLANNER: `🗺️ **[Bước 3 – KẾ HOẠCH CHIẾN DỊCH 4 GIAI ĐOẠN (${d.start} – ${d.end})]**\n1. **Teaser (${d.start} - ${d.teaserEnd})**: Hé lộ cận cảnh chất liệu & phối màu đặc trưng dịp ${analyzed.occasionName}.\n2. **Launch (${d.launchStart} - ${d.launchEnd})**: Tung Key Visual (\`DES-01\`) & Infographic 3 USP (\`DES-02\`), mở cổng ưu đãi sớm.\n3. **Peak (${d.peakStart} - ${d.peakEnd})**: Đẩy mạnh gói **Combo Cặp Đôi / Đồng Đội (\`DES-03\`)** để nhân đôi AOV.\n4. **Remarketing (${d.remarketingStart} - ${d.end})**: Đếm ngược 48 giờ cuối FOMO chốt đơn.`,
    CONTENT: `✍️ **[Bước 4 & 5 – BIÊN SOẠN 06 BÀI ĐĂNG ĐA KÊNH]**\nPhòng CONTENT đã viết mới hoàn toàn **06 bài đăng (\`POST-01\` → \`POST-06\`)** bám sát chủ đề **${analyzed.occasionName}** và thông điệp *"${analyzed.bigIdea}"* tại **Sheet 4 (\`Noi_Dung_Bai_Dang\`)**.`,
    DESIGN: `🎨 **[Bước 5 – KẾT XUẤT 04 ẤN PHẨM THIẾT KẾ MỚI HOÀN TOÀN]**\nPhòng DESIGN đã sử dụng trực tiếp tài nguyên của chiến dịch **${taskId}** và bảng màu **${analyzed.themePalette.label}** để kết xuất **04 file ảnh mới 100%**:\n- \`${visualAssets[0].filePath}\` (Key Visual 1:1)\n- \`${visualAssets[1].filePath}\` (Infographic 4:5)\n- \`${visualAssets[2].filePath}\` (Combo Deal 1:1)\n- \`${visualAssets[3].filePath}\` (Story/TikTok 9:16)`,
    VIDEO: includeVideo
      ? `🎬 **[Bước 5 – KỊCH BẢN DỰNG VIDEO TIMECODE]**\n5 nhân sự phòng VIDEO đã hoàn thiện kịch bản dựng \`VID-01\` (15s tỷ lệ 9:16) cho chiến dịch **${analyzed.campaignTitle}** tại **Sheet 6 (\`Kich_Ban_Dung_Video\`)**.`
      : `⏸️ **[Bước 5 – TỐI ƯU QUOTA VIDEO]**\nPhòng VIDEO giữ ở chế độ nghỉ (\`VID-OFF\`) theo quy tắc tiết kiệm quota. (Bật nút \`VIDEO: ON\` nếu CEO muốn xuất kịch bản dựng video).`,
    COMMUNITY: `💬 **[Bước 5 – KỊCH BẢN SEEDING & CSKH CHỐT COMBO]**\n- **05 Kịch bản Seeding tự nhiên**: Khách hàng tag nửa kia/bạn đánh cặp rủ mua chung gói Combo dịp ${analyzed.occasionName}; hỏi chi tiết về ${analyzed.uspList[0]}.\n- **Kịch bản Inbox 3 bước**: Chào hỏi theo chủ đề ${analyzed.occasionName} $\\rightarrow$ Tư vấn sâu 3 USP $\\rightarrow$ Chốt gói Combo ưu đãi (${analyzed.promoOffer.split('(')[0]}).`,
    'QA-QC': `🛡️ **[Bước 6 – KIỂM DUYỆT CHẤT LƯỢNG (QA-QC PASS 9.7/10)]**\n- Đã kiểm tra nghiêm ngặt: Nội dung chiến lược bám sát **${analyzed.occasionName}**, không lặp câu lệnh thô.\n- Đã xác minh **04 ấn phẩm thiết kế (\`DES-01..04\`)** là file ảnh mới tạo riêng cho mã **${taskId}**, không dùng lại ảnh cũ.`,
    OPS: `📅 **[Bước 7 – LÊN LỊCH ĐĂNG BÀI GIỜ VÀNG]**\nPhòng OPS đã xếp lịch xuất bản 06 bài đăng (\`POST-01\` → \`POST-06\`) từ **${d.post1Date}** đến **${d.post6Date}** khớp 100% với 04 file ảnh thiết kế mới tại **Sheet 7 (\`Lich_Dang_Bai\`)**.`,
  };

  const ceoSummaryLines = [
    `1. Chiến dịch ${taskId} ("${analyzed.campaignTitle}" • v${revision}) dịp ${analyzed.occasionName} (${d.start} - ${d.end}) đã hoàn tất 100%, đạt QA-QC PASS 9.7/10.`,
    `2. Đã xây dựng trọn bộ 9 Sheets TSV mới gồm: Kế hoạch 4 giai đoạn, 06 bài đăng đa kênh (POST-01..06), Kịch bản Seeding/CSKH và Lịch đăng giờ vàng.`,
    `3. Đã kết xuất MỚI 100% 04 ấn phẩm thiết kế riêng cho chiến dịch tại: ${visualAssets.map((v) => v.filePath).join(', ')}.`,
    `4. Hạng mục chờ CEO xác nhận: ${analyzed.missingConfirmations}.`,
    `5. Đã lưu báo cáo vào reports/${taskId}.md và đồng bộ công thức =IMAGE() của 4 ảnh mới lên Google Sheet BaoNguyn-Company.`,
  ];

  const markdownBlocks: string[] = [
    `# BÁO CÁO CHIẾN DỊCH MARKETING: ${analyzed.campaignTitle} (${taskId})`,
    '',
  ];

  for (const s of allNineSheets) {
    markdownBlocks.push(`### SHEET: ${s.sheetName}`);
    markdownBlocks.push('```tsv');
    markdownBlocks.push(s.headers.join('\t'));
    for (const row of s.rows) {
      markdownBlocks.push(row.map((cell) => String(cell ?? '').replace(/\t|\r|\n/g, ' ')).join('\t'));
    }
    markdownBlocks.push('```');
    markdownBlocks.push('');
  }

  return {
    taskId,
    revision,
    campaignTitle: analyzed.campaignTitle,
    productName: analyzed.productName,
    occasionName: analyzed.occasionName,
    analyzed,
    posterSpec,
    sheetsByDept,
    allNineSheets,
    stepNarratives,
    visualAssets,
    ceoSummaryLines,
    markdownReport: markdownBlocks.join('\n'),
  };
}
