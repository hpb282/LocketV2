# AI & Sticker

Mở một ảnh đã lưu, chọn **AI & Sticker**. Sau khi chụp hoặc nhập ảnh, nút này tự lưu ảnh gốc vào thư viện trước khi mở trình chỉnh sửa. Video tiếp tục dùng công cụ ghi chú/khung, chưa hỗ trợ chuyển hoạt hình hoặc sticker.

## Sticker trên laptop

Chọn kính, mũ, vương miện hoặc tai mèo để app tự đặt theo khuôn mặt rõ nhất. Có thể tắt **Tự đặt theo khuôn mặt**, kéo sticker, dùng phím mũi tên, đổi kích thước, xoay, nhân đôi hoặc xóa. Mèo, cún và lấp lánh đặt vào góc ảnh để tự bố trí. Tối đa 20 sticker mỗi ảnh.

Nhận diện chạy trên CPU trong worker, không gửi ảnh hoặc điểm khuôn mặt lên mạng. SDK, WASM và mô hình đã có trong bộ cài. Lần nhận diện đầu cần thêm thời gian để nạp mô hình; những sticker sau dùng kết quả đã tìm trên ảnh đó. Khi không thấy khuôn mặt, vẫn đặt thủ công được. Ảnh nhiều người hiện tự chọn khuôn mặt lớn nhất; có thể kéo sang người khác.

## Tạo ảnh hoạt hình

1. Chuyển sang **Ảnh AI**.
2. Chọn **Lấy API key** để mở trang OpenAI chính thức. Tạo khóa riêng, bật quyền tạo ảnh và thiết lập thanh toán/số dư theo tài khoản API của bạn. Không gửi khóa qua chat hay commit vào GitHub.
3. Dán khóa vào ô trong app và chọn **Dùng khóa cho phiên này**. Thao tác thiết lập chưa gửi ảnh hay gọi tạo ảnh.
4. Chọn Anime, Chibi, Truyện tranh hoặc Hoạt hình 3D; chọn **Đẹp & nhanh** hoặc **Ưu tiên chi tiết**.
5. Bấm **Tạo ảnh AI**. Ảnh gốc đang chọn được gửi đến OpenAI qua HTTPS; không gửi cả thư viện, hồ sơ hoặc thông tin người phát triển. Kết quả phụ thuộc ảnh, mô hình, quyền API và dịch vụ; nét mặt có thể thay đổi khi cách điệu.
6. So sánh với ảnh gốc, thêm sticker nếu muốn, rồi **Lưu bản mới**. Ảnh gốc vẫn giữ nguyên trong thư viện; ghi chú và khung được giữ trên bản mới, vẫn sửa được.

Chế độ Đẹp & nhanh dùng `gpt-image-2.5-flare`, Ưu tiên chi tiết dùng `gpt-image-2.5-sunburst`; cả hai dùng chất lượng `high`, trả PNG, một ảnh mỗi yêu cầu. Ảnh gửi có cạnh dài tối đa 2048 px, chỉ giảm kích thước bản gửi khi cần, không ghi đè bản gốc. Mỗi lần bấm tạo lại xử lý từ ảnh gốc đã chọn.

API có phí riêng theo tài khoản và bảng giá hiện hành, không được miễn phí chỉ vì tải app. Mỗi lần bấm tạo là một yêu cầu mới; app không tự retry khi lỗi/hết thời gian. **Dừng chờ** chỉ ngừng chờ kết quả trên app: yêu cầu đã gửi có thể vẫn được dịch vụ xử lý và tính phí. Không bấm liên tục nếu dịch vụ đang chậm. Link **Xem phí API** mở bảng giá chính thức.

Khóa chỉ giữ trong bộ nhớ tiến trình chính cho lần mở app, không lưu vào thư viện, cài đặt, GitHub hay bộ cài; đóng app cần nhập lại. Có thể **Quên khóa** ngay trong trình chỉnh sửa. Mỗi người dùng khóa riêng, không nhúng khóa cá nhân vào app chia sẻ cho bạn bè. Dữ liệu được gửi để tạo ảnh chịu chính sách dữ liệu API của OpenAI; đây là xử lý online theo yêu cầu, không phải đồng bộ thư viện.

## Kiểm chứng và giới hạn

Kiểm thử desktop dùng mô hình MediaPipe thật để đặt sticker, thao tác kéo/xoay, so sánh, lưu bản sao và kiểm tra ảnh gốc không đổi. Luồng OpenAI được kiểm thử bằng phản hồi giả lập, gồm giới hạn API, lỗi, hủy, khóa trong bộ nhớ, kiểm tra PNG và lưu riêng. Chưa thực hiện tạo ảnh tính phí với khóa thật trong quá trình phát triển bản này; cần kiểm tra kết quả thực tế bằng tài khoản API của người dùng.

Tài liệu tham khảo: [API chỉnh ảnh](https://developers.openai.com/api/reference/resources/images/methods/edit), [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare), [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst), [giá API](https://developers.openai.com/api/docs/pricing).
