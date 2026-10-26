# BAO NGUYN 3D AI COMPANY — HỆ THỐNG MULTI-AGENT MARKETING 3D TƯƠNG TÁC

Dự án "Công ty AI ảo" 3D tương tác (React Three Fiber / Three.js + Express Multi-LLM Backend), được khởi tạo trực tiếp từ kiến trúc `init core project` (`.agent/`, `AGENTS.md`, `scripts/llm_router.js`, `scripts/sync_to_sheet.js`) và tuân thủ hệ thống thiết kế **UI/UX Pro Max** (`design-system/baonguyn-3d-ai-company/MASTER.md`).

---

## 1. Kiến Trúc & Dữ Liệu Thực Tế Từ Core Project

### 9 Phòng Ban (Toà Nhà 3D)
1. **CEO HQ & `MKT-DIRECTOR`** (`[0, 0, 0]`): Trụ sở trung tâm — nhận yêu cầu từ CEO, điều phối Quy trình 8 bước và xuất Sheet 1 (`Brief_Tong_Quan`), Sheet 2 (`Phan_Cong_Nhiem_Vu`), Sheet 9 (`Bao_Cao_Cho_CEO`).
2. **`PLANNER`**: Phòng Chiến Lược & Kế Hoạch — xuất Sheet 3 (`Ke_Hoach_Chien_Dich` 4 giai đoạn: Teaser, Launch, Peak, Remarketing).
3. **`RESEARCH`**: Phòng Nghiên Cứu & Phân Tích — cung cấp insight thị trường, đối thủ, xu hướng, hashtag.
4. **`CONTENT`**: Phòng Nội Dung — xuất Sheet 4 (`Noi_Dung_Bai_Dang`) cho Facebook, TikTok, Instagram.
5. **`DESIGN`**: Phòng Thiết Kế Đồ Họa — xuất Sheet 5 (`Brief_Thiet_Ke`) và kết xuất hình ảnh thực tế tại `assets/`.
6. **`VIDEO`**: Phòng Sản Xuất Video — xuất Sheet 6 (`Kich_Ban_Dung_Video` theo timecode), áp dụng chính sách `on_demand_only` (tiết kiệm quota).
7. **`OPS`**: Phòng Vận Hành & Đăng Bài — xuất Sheet 7 (`Lich_Dang_Bai`) và đồng bộ Google Sheets.
8. **`COMMUNITY`**: Phòng Cộng Đồng & CSKH — kịch bản seeding, trả lời inbox, xử lý khủng hoảng, minigame.
9. **`QA-QC`**: Phòng Kiểm Soát Chất Lượng — xuất Sheet 8 (`QA_QC_Log`), chấm điểm 1–10 (PASS/FAIL).

### 21 Nhân Viên AI (Nhân Vật 3D Độc Lập)
- **`MKT-DIRECTOR`**: `Director-01`, `Coordinator-02`
- **`PLANNER`**: `Planner-01`, `Planner-02`
- **`RESEARCH`**: `Research-01`, `Research-02`
- **`CONTENT`**: `Content-01`, `Content-02`
- **`DESIGN`**: `Design-01`, `Design-02`
- **`VIDEO` (5 vị trí chuyên trách trong `06-video.md`)**: `VIDEO-LEAD` (6.1), `VIDEO-EDITOR` (6.2), `VIDEO-MOTION` (6.3), `VIDEO-AUDIO` (6.4), `VIDEO-COLOR` (6.5)
- **`OPS`**: `Ops-01`, `Ops-02`
- **`COMMUNITY`**: `Community-01`, `Community-02`
- **`QA-QC`**: `QA-01`, `QA-02`

---

## 2. Cấu Trúc Thư Mục

```text
BaoNguyn-company/
├── .agent/                         # Core multi-agent specs, skills, departments_config.json
├── design-system/                  # Persisted UI/UX Pro Max Design System (MASTER.md)
├── scripts/                        # Core LLM router & Google Sheets 9-Sheet sync scripts
├── reports/                        # Lịch sử báo cáo chiến dịch 9 Sheets TSV
├── assets/                         # Ấn phẩm hình ảnh thực tế
└── web/                            # Ứng dụng 3D AI Company (Frontend + Backend)
    ├── server/
    │   └── index.js                # Express API: AES-256-GCM key vault, LLM proxy, SSE stream, Skill installer
    ├── src/
    │   ├── components/
    │   │   ├── scene/
    │   │   │   └── CompanyCampus3D.tsx    # Bản đồ 3D: CEO HQ, 8 Phòng ban, Căng-tin, 21 Nhân viên, Pathfinding
    │   │   └── hud/
    │   │       ├── TopNavigationHUD.tsx   # Thanh điều khiển trên: FPS, Auto Idle, Cost Cap, Sync 9 Sheets, VI/EN
    │   │       ├── BottomEmployeeDock.tsx # Thanh nhân viên cuộn ngang (Click đơn focus, Double-click mở panel)
    │   │       ├── EmployeeDetailPanel.tsx# Panel phải: Cấu hình Model/API Key, Test kết nối, Cài Skill GitHub
    │   │       ├── CeoTaskModal.tsx       # Modal CEO HQ: Giao task, chọn phòng ban/Auto, ưu tiên, lịch sử
    │   │       └── DepartmentQuickCard.tsx# Card thông tin nhanh khi click vào toà nhà phòng ban
    │   ├── data/
    │   │   └── mockCompanyData.ts  # Khởi tạo dữ liệu chuẩn từ init core project
    │   ├── store/
    │   │   └── useCompanyStore.ts  # Zustand state + Autonomous Behavior FSM + SSE handler
    │   └── types/
    │       └── company.ts          # TypeScript interfaces
    ├── package.json
    └── vite.config.ts
```

---

## 3. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Cài đặt dependencies
```bash
cd web
npm install --legacy-peer-deps
```

### Bước 2: Cấu hình biến môi trường (Tuỳ chọn)
Tạo file `.env` tại thư mục gốc `BaoNguyn-company/.env` (hoặc nhập trực tiếp API Key cho từng nhân viên ngay trên giao diện 3D):
```env
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
DEEPSEEK_API_KEY=""
OPENROUTER_API_KEY=""
VAULT_SECRET="BaoNguyn-3D-AI-Company-Vault-Key-2026"
```
> **Chế độ Demo/Built-in**: Khi chưa nhập API key ngoài, hệ thống mặc định hỗ trợ provider `antigravity` / `mock` để toàn bộ luồng giao task, test kết nối và tự chạy nền hoạt động trơn tru không bị gián đoạn.

### Bước 3: Chạy môi trường Development (Frontend + Backend đồng thời)
```bash
cd web
npm run dev
```
- **Frontend 3D UI**: `http://localhost:5173`
- **Backend API & SSE Server**: `http://localhost:3001`

### Bước 4: Build Production
```bash
cd web
npm run build
```
