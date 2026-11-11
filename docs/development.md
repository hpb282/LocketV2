# Phát triển và phát hành

## Cấu trúc

- `src/Capture.tsx`: vòng đời webcam, hẹn giờ, MediaRecorder, giới hạn 10 giây.
- `src/Review.tsx`, `src/Tools.tsx`: xem lại, ghi chú và công cụ trang trí.
- `src/frames.ts`: renderer Canvas dùng chung khi xem và khi xuất ảnh.
- `src/palettes.ts`: danh sách màu nền neon; giá trị màu được áp dụng qua CSS variables trong `styles.css` và `data-palette` trên cả cửa sổ chính lẫn cửa sổ ghim.
- `src/Memories.tsx`, `src/calendar.ts`: lịch kỷ niệm và gom ngày theo múi giờ của laptop, bỏ qua khoảnh khắc trong thùng rác.
- `src/Profile.tsx`, `src/Avatar.tsx`: chỉnh hồ sơ và avatar ở thanh bên.
- `electron/profile.cjs`: kiểm tra dữ liệu hồ sơ và ngày sinh; ảnh đại diện được chọn/chuẩn hóa trong tiến trình chính.
- `src/App.tsx`: thư viện, yêu thích, thùng rác, cài đặt và cửa sổ ghim.
- `src/Updates.tsx`: giao diện cập nhật.
- `electron/library.cjs`: lưu trữ, ghi nguyên tử, bản sao chỉ mục, phiên bản schema.
- `electron/main.cjs`: cửa sổ native, IPC giới hạn, hộp chọn/lưu file, giao thức media có hỗ trợ Range cho video.
- `electron/updater.cjs`: trạng thái kiểm tra/tải/cài bản mới; có thể kiểm thử độc lập.

Ứng dụng dùng Electron + React + TypeScript + Vite. Không có máy chủ, tài khoản trực tuyến hoặc kết nối với dịch vụ Locket. Chỉ chức năng cập nhật kết nối GitHub khi người dùng chủ động bấm.

## Thêm tính năng

1. Viết màn hình/component trong `src/`; dùng biến màu trong `styles.css` để hỗ trợ cả hai theme.
2. Với thao tác file/native, thêm action cụ thể trong `electron/main.cjs`. Không mở API thực thi lệnh hoặc đường dẫn tùy ý ra renderer.
3. Metadata mới cần giá trị mặc định và migration trong `electron/library.cjs`. Không đổi `appId`, tên thư mục dữ liệu, hoặc xóa thư viện khi nâng phiên bản.
4. Thêm kiểm thử cho hành vi ảnh hưởng dữ liệu, quyền truy cập tệp, camera hoặc cập nhật.
5. Chạy `npm test`, `npm run build`, `npm run test:ui`.

## Phát hành bản mới

1. Thay phiên bản trong `package.json` và cập nhật lockfile bằng `npm install --package-lock-only`.
2. Viết nội dung phiên bản trong `docs/release-notes.md`.
3. Commit và push, chờ workflow xanh.
4. Tạo tag trùng phiên bản, ví dụ `git tag v0.2.0` rồi `git push origin v0.2.0`.
5. GitHub Actions kiểm tra trên Linux và Windows, build NSIS, rồi tạo GitHub Release chứa `.exe`, `latest.yml`, `.exe.blockmap`.
6. Người dùng mở **Cập nhật → Kiểm tra cập nhật → Tải bản cập nhật → Cài đặt & khởi động lại**. Bản cài NSIS mới dùng cùng `appId` và thư viện cũ.

Không phát hành tag đã tồn tại với mã nguồn khác. Phiên bản prerelease và downgrade không được tự động cài. Bản dev không tự cập nhật.

## Repo riêng tư

Repo LocketV2 hiện private. Người dùng cần quyền đọc repo để tải Releases. Trong mục quyền truy cập trên màn hình cập nhật, người dùng có thể nhập fine-grained GitHub token chỉ có **Contents: Read** cho LocketV2. Token chỉ nằm trong bộ nhớ tiến trình chính cho phiên làm việc, không lưu vào thư viện, file cấu hình hay binary. Không nhúng `GH_TOKEN` phát hành vào mã nguồn hoặc cấu hình `publish`.

Nếu muốn bạn bè tải/cập nhật không cần xác thực, chủ repo có thể chủ động công khai repo phát hành hoặc cấu hình nguồn phát hành công khai riêng trong `electron/updater.cjs` và `package.json`. App không tự thay đổi quyền riêng tư của repo.

## Dữ liệu

Thư mục mặc định trên Windows: `%APPDATA%\Locket x HPB\library`.

- `library.json`: metadata ảnh/video, ghi chú, trang trí, cài đặt; `schemaVersion: 1`.
- `library.json.bak`: bản sao chỉ mục gần nhất; khi file chính hỏng app thử khôi phục và báo cho người dùng.
- `media/`: tệp ảnh/video riêng theo UUID. Trang trí và ghi chú không ghi đè lên ảnh gốc trong thư viện.
- `avatars/`: avatar JPEG 512×512 theo UUID, tách khỏi ảnh/video. Khi đổi avatar, app giữ ảnh đang dùng và ảnh được chỉ mục sao lưu tham chiếu, dọn những avatar cũ hơn.

Nút **Mở thư mục thư viện** cho phép sao lưu thủ công. Đóng app trước khi sao chép toàn bộ thư mục `library`; bản sao chỉ mục `.bak` không thay thế bản sao lưu toàn bộ thư viện. App không mã hóa ảnh trên đĩa. Cập nhật hoặc gỡ bản cài mặc định không xóa dữ liệu.

Từ 0.2.0, `settings.palette` lưu màu nền (`yellow`, `blue`, `green`, `red`, `pink`, `purple`, `cyan`). Thư viện 0.1.0 thiếu khóa này sẽ nhận mặc định `yellow`, giữ các cài đặt và khoảnh khắc hiện có; schema vẫn tương thích phiên bản 1.

Từ 0.3.0, `profile` lưu `displayName`, `nickname`, `birthday` (ngày lịch `YYYY-MM-DD`, không chuyển sang UTC), `bio`, `location`, `avatarId`. Thư viện cũ thiếu hồ sơ sẽ nhận hồ sơ trống với tên mặc định “Bạn”, giữ nguyên ảnh/video và cài đặt. Avatar chỉ truy cập qua `media://avatar/<id>` khi id khớp ảnh hiện tại. Các action hồ sơ chỉ cho cửa sổ chính gọi. Toàn bộ dữ liệu vẫn ở thư mục `library` hiện có.

Để kiểm thử cô lập, dùng `HPB_USER_DATA` trỏ tới thư mục tạm. Không dùng thư viện thật để chạy test. Renderer dùng context isolation, sandbox và CSP; không có Node.js API. Các tệp app/media chỉ được phục vụ qua giao thức với đường dẫn đã xác thực.

## Giới hạn bản 0.1

- Mục tiêu phát hành là Windows x64; nguồn có thể chạy trên Linux/macOS nhưng chưa có bộ cài chính thức cho hai nền tảng đó.
- Nhập một ảnh mỗi lần; ảnh được chuẩn hóa JPEG tối đa cạnh dài 2048 px, không quá 24 MP đầu vào. Video mới quay dùng WebM.
- Ghi chú tối đa 240 ký tự. Hiệu ứng chữ và khung video hiển thị trong app; xuất video gốc không ghép chúng vào từng frame video.
- Bộ cài chưa được ký bằng chứng chỉ Windows. Tự cập nhật phụ thuộc phiên bản đã phát hành và quyền đọc GitHub Releases.
- Đã kiểm thử quy trình camera bằng thiết bị giả lập. Webcam và micro thật cần thử thêm trên laptop của người dùng.
