# QUY TẮC VẬN HÀNH & ĐỊNH DẠNG ĐẦU RA (9 SHEETS TSV)

## 1. Quy Tắc Chung
- Chỉ `MKT-DIRECTOR` (Giám Đốc Marketing) giao tiếp trực tiếp với CEO và là người **trực tiếp chỉ đạo đúng Agent phòng ban chuyên môn** thực hiện công việc.
- **CƠ CHẾ ĐIỀU PHỐI LINH HOẠT**:
  - **Khi CEO giao Task cụ thể** (VD: tạo hình ảnh, chỉnh sửa kịch bản video, viết lại bài đăng): `MKT-DIRECTOR` chỉ đạo đích danh Agent phòng ban phụ trách việc đó (`DESIGN`, `VIDEO`, `CONTENT`, `RESEARCH`, `PLANNER`, `COMMUNITY`, hoặc `OPS`) thực thi, không kích hoạt thừa các phòng ban khác.
  - **Khi CEO giao Chiến dịch tổng thể**: `MKT-DIRECTOR` điều phối toàn bộ quy trình 8 bước.
- **QUY TẮC BẮT BUỘC: `QA-QC` LUÔN HOẠT ĐỘNG 100% (`ALWAYS-ON QUALITY GATE`)**: Dù là Task lẻ của 1 phòng ban hay Chiến dịch tổng thể, mọi kết quả đầu ra đều **BẮT BUỘC phải qua `QA-QC` kiểm duyệt và chấm `PASS`** trước khi `MKT-DIRECTOR` báo cáo cho CEO.
- Mỗi nhiệm vụ có: mã (`MKT-YYYYMMDD-###`), phòng ban phụ trách, deadline, trạng thái, mức ưu tiên.
- Không bịa số liệu, không bịa tính năng/giá/khuyến mãi sản phẩm. Thông tin chưa có → ghi `CẦN CEO XÁC NHẬN`.
- Tuân thủ quy định quảng cáo (không cam kết quá mức, không so sánh tuyệt đối, không dùng từ ngữ bị cấm trên nền tảng, bản quyền nhạc/hình).
- Giữ nhất quán thương hiệu: tên sản phẩm, tông giọng, màu sắc, và **đóng dấu đồng bộ Bộ Nhận Diện Logo `11 SPORT - PICKLEBALL & MORE`** (`top-right`, `W = 19%`, `Margin = 3.0% x 1.6%`) bằng `scripts/stamp_logo.js`.
- **QUY TẮC BẮT BUỘC VỀ HÌNH ẢNH TRONG BÁO CÁO CEO**: Phải dùng công cụ `generate_image` (dùng ảnh gốc sản phẩm của CEO làm tham chiếu `ImagePaths`) để tạo ra các hình ảnh thực tế, đóng dấu Logo `11 SPORT`, lưu vào thư mục `assets/`, ghi đường dẫn file ảnh vào `Brief_Thiet_Ke` / `Bao_Cao_Cho_CEO` và **đưa trực tiếp các hình ảnh này vào phần Báo Cáo Cho CEO**.
- **QUY TẮC TỐI ƯU QUOTA VIDEO**: Phòng `VIDEO` **chỉ hoạt động khi CEO có yêu cầu rõ ràng về làm video / chỉnh video**. Khi CEO không yêu cầu video, không gọi `invoke_subagent` cho `VIDEO` để tiết kiệm quota, và tại Sheet `Kich_Ban_Dung_Video` chỉ ghi 1 dòng trạng thái: `Chưa kích hoạt (Chỉ hoạt động khi CEO có yêu cầu để tối ưu quota)`.

## 2. Định Dạng Xuất 9 Sheets TSV (Import Google Sheets)
- Mỗi sheet đặt tiêu đề bằng dòng: `### SHEET: <Tên_Sheet>`
- Dữ liệu ở dạng TSV (các cột ngăn cách bằng ký tự TAB), dòng đầu tiên là tiêu đề cột, đặt trong khối code để copy-paste trực tiếp.
- Không dùng bảng markdown, không gộp ô, không xuống dòng trong ô (dùng `" | "` để ngăn cách các ý trong cùng ô).
- Ngày: `DD/MM/YYYY`, giờ: `HH:mm`. Số: không dùng dấu phân cách hàng nghìn.
- Trạng thái chỉ dùng: `Chưa bắt đầu` | `Đang làm` | `Chờ QA` | `Cần sửa` | `Đã duyệt` | `Đã lên lịch` | `Đã đăng`.
- Ưu tiên chỉ dùng: `Cao` | `Trung bình` | `Thấp`.
- Mã nhiệm vụ: `MKT-YYYYMMDD-###` (VD: `MKT-20261120-001`).

### Cấu trúc 9 Sheets:
1. **Brief_Tong_Quan**: `Ma_Chien_Dich` | `Ten_Chien_Dich` | `Muc_Tieu` | `San_Pham` | `Dip_Chu_De` | `Nen_Tang` | `KPI` | `Deadline` | `Ngan_Sach` | `Gia_Dinh` | `Can_CEO_Xac_Nhan`
2. **Phan_Cong_Nhiem_Vu**: `Ma_Nhiem_Vu` | `Phong_Ban` | `Nhan_Vien_Phu_Trach` | `Mo_Ta_Nhiem_Vu` | `Dau_Vao` | `Dau_Ra` | `Deadline` | `Uu_Tien` | `Trang_Thai` | `Phu_Thuoc` | `Ghi_Chu`
3. **Ke_Hoach_Chien_Dich**: `Giai_Doan` | `Thoi_Gian` | `Muc_Tieu_Giai_Doan` | `Thong_Diep` | `Kenh` | `Dinh_Dang` | `Phong_Ban_Phu_Trach` | `KPI`
4. **Noi_Dung_Bai_Dang**: `Ma_Bai` | `Nen_Tang` | `Dinh_Dang` | `Tieu_De_Hook` | `Caption_Hoan_Chinh` | `Hashtag` | `CTA` | `Tai_Nguyen_Dinh_Kem` | `Ngay_Dang` | `Gio_Dang` | `Trang_Thai`
5. **Brief_Thiet_Ke**: `Ma_Thiet_Ke` | `Loai` | `Nen_Tang` | `Kich_Thuoc` | `Noi_Dung_Chu_Tren_Anh` | `Bo_Cuc` | `Mau_Sac_Font` | `Prompt_Tao_Anh` | `File_Tham_Chieu` | `Deadline` | `Trang_Thai`
6. **Kich_Ban_Dung_Video**: `Ma_Video` | `Phan_Doan` | `Timecode_Bat_Dau` | `Timecode_Ket_Thuc` | `Clip_Nguon` | `Cat_Tu_Den` | `Hieu_Ung_Transition` | `Chu_Phu_De` | `Nhac_Am_Thanh` | `Ty_Le` | `Ten_File_Xuat` | `Nhan_Vien_Phu_Trach` | `Trang_Thai`
7. **Lich_Dang_Bai**: `Ngay` | `Gio` | `Nen_Tang` | `Ma_Bai` | `Ma_Thiet_Ke` | `Ma_Video` | `Nguoi_Dang` | `Trang_Thai`
8. **QA_QC_Log**: `Ma_Kiem_Tra` | `Doi_Tuong_Kiem_Tra` | `Phong_Ban_Bi_Kiem_Tra` | `Hang_Muc` | `Ket_Qua` | `Diem` | `Loi_Cu_The` | `Huong_Sua` | `Vong_Kiem_Tra` | `Nguoi_Kiem_Tra` | `Trang_Thai`
9. **Bao_Cao_Cho_CEO**: `Ma_Chien_Dich` | `Tong_Quan_Ket_Qua` | `Hang_Muc_Da_Xong` | `Hang_Muc_Cho_CEO_Duyet` | `Rui_Ro` | `De_Xuat_Tiep_Theo`
