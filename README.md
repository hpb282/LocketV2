# Locket x HPB

Ứng dụng desktop cá nhân để giữ ảnh, video và những ghi chú nhỏ. Chạy offline, lưu dữ liệu trên laptop, giao diện gọn với các màu nền neon và chế độ sáng/tối. Một dự án độc lập, không kết nối với Locket chính thức.

## Cài trên Windows

1. Mở [GitHub Releases](https://github.com/hpb282/LocketV2/releases).
2. Tải tệp **Locket-x-HPB-…-Windows-Setup.exe** của bản mới nhất.
3. Chạy bộ cài và chọn thư mục. App được thêm vào **Start Menu** và tạo **shortcut trên Desktop** với icon riêng.
4. Mở **Locket x HPB**. Cấp quyền webcam/micro khi bạn muốn dùng chúng; vẫn có thể chọn ảnh từ máy khi không có webcam.

Bản cài dành cho Windows 10/11 x64. Repo hiện công khai, bạn bè có thể tải trực tiếp từ Releases. Trước khi Release xuất hiện, có thể tải bộ cài ở **Actions → Build and release Windows app → Artifacts** sau khi workflow thành công.

## Tính năng

- Chụp webcam, chọn camera, lật gương, hẹn giờ 3 hoặc 5 giây.
- Nhập ảnh từ laptop; xem lại, chụp lại và lưu.
- Quay video tối đa 10 giây, dừng sớm, bật/tắt micro.
- Ghi chú bo tròn ở mép dưới ảnh/video, sửa sau khi lưu.
- Khung Halloween, Giáng sinh, Tết, sinh nhật, Polaroid; hiệu ứng chữ, màu và cỡ chữ.
- Bảng công cụ trang trí bên phải có thể mở rộng/thu gọn.
- Lưới ảnh/video, tìm ghi chú, lọc loại/tháng, yêu thích, chỉnh kích thước lưới.
- **Kỷ niệm:** lịch theo tháng/ngày với ảnh đại diện từng ngày và số lượng ảnh/video; bấm ngày để xem lại.
- **Hồ sơ cá nhân:** bấm avatar ở đầu thanh bên trái để sửa tên, biệt danh, ngày sinh, giới thiệu, thành phố và đổi ảnh đại diện.
- **Người phát triển:** trong Cài đặt, xem thông tin Hồ Phương Bắc · hpb, sao chép email/số điện thoại; quét/phóng lớn QR và mở Zalo, Instagram, Messenger.
- Xem lớn, phím ← → chuyển khoảnh khắc, Esc về thư viện.
- Xuất ảnh PNG có ghi chú và khung; xuất video WebM gốc.
- Cửa sổ ảnh/video ghim, đổi kích thước, chuyển khoảnh khắc, luôn nổi tùy chọn.
- Thùng rác, chọn nhiều, khôi phục, xác nhận trước khi xóa vĩnh viễn.
- Sáng / Tối / Theo hệ thống; cài đặt được giữ qua các lần mở app.
- 7 màu phủ toàn bộ nền và thanh bên: vàng, xanh dương, xanh lá, đỏ, hồng, tím, cyan; chọn trong **Cài đặt → Màu nền neon**, đồng bộ cả cửa sổ ghim.
- Hai dải neon chuyển động quanh camera và khung xem lại, đổi theo màu đang chọn; đứng yên khi hệ thống bật giảm chuyển động.
- **Cập nhật trong app:** kiểm tra → tải → cài và khởi động lại từ GitHub Releases, giữ nguyên thư viện.

## Chạy mã nguồn

Cài Node.js 24 LTS và Git, sau đó:

```bash
git clone https://github.com/hpb282/LocketV2.git
cd LocketV2
npm ci
npm run dev
```

`npm run dev` mở app Electron và giao diện phát triển. Electron có thể tải binary lần đầu khởi chạy. `npm run dev:web` chỉ để xem giao diện trong trình duyệt; chức năng lưu file/native cần bản Electron.

```bash
npm test         # kiểm thử lưu trữ và cập nhật
npm run build    # kiểm tra TypeScript và build giao diện
npm run test:ui  # kiểm thử app desktop với webcam giả lập
npm run dist:win # tạo bộ cài Windows trong release/ (chạy trên Windows)
```

## Cập nhật và mở rộng

Nút **Cập nhật** nằm ở thanh bên trái, đồng thời có trong **Cài đặt**. App không tự tải/cài âm thầm. Nguồn phát hành công khai không cần token. Nếu chuyển repo sang riêng tư, màn hình cập nhật hỗ trợ token đọc Releases do người dùng cung cấp cho phiên làm việc; không có token dùng chung đóng gói trong app.

Xem [hướng dẫn phát triển, dữ liệu và phát hành](docs/development.md) để thêm tính năng và tạo bản cập nhật bằng tag phiên bản. Hosting và đồng bộ đám mây được dành cho giai đoạn sau.

Bản **0.2.0** bỏ phần chữ giới thiệu trên màn hình chụp, thêm các màu nền neon nhẹ và giữ nguyên thư viện của bản 0.1.0 khi cập nhật.

Bản **0.3.0** thêm lịch Kỷ niệm và hồ sơ cá nhân, thay nút HPB trong thanh bên bằng avatar có thể đổi. Hồ sơ được lưu riêng trong thư viện cục bộ; avatar không được tính là ảnh chụp và không xuất hiện trong lịch.

Bản **0.4.0** thêm mục Người phát triển với các thông tin liên hệ và ba QR được tạo từ liên kết liên hệ. QR có sẵn trong app, xem được khi offline; mở liên kết cần kết nối Internet. Thông tin người phát triển tách riêng khỏi hồ sơ của người dùng.

Bản **0.5.0** phủ màu toàn bộ cửa sổ, đồng bộ nền thanh bên và ảnh ghim; thêm hai dải neon chạy chậm quanh camera và khung xem lại. Cả 7 màu đều hỗ trợ sáng/tối, giữ lựa chọn màu và thư viện sau cập nhật.
