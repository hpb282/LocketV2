# Thành phần bên thứ ba

Mã ứng dụng Locket x HPB theo giấy phép MIT trong `LICENSE`. Các dependency giữ giấy phép riêng của chúng.

## MediaPipe Tasks Vision

- `@mediapipe/tasks-vision` phiên bản 1.2.3, Google, Apache License 2.0.
- Nguồn và giấy phép: https://github.com/google-ai-edge/mediapipe .
- SDK được bundle vào worker; hai tệp WASM/module runtime được sao chép từ phiên bản npm đã pin trong lockfile. Giấy phép và thông tin nguồn được đóng gói trong `dist/vision/LICENSE.txt` và `NOTICE.txt`.

## Mô hình Face Landmarker

- Google MediaPipe Face Landmarker, float16, phiên bản 1.
- Nguồn: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task .
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- Giấy phép Apache License 2.0, lưu tại `build/vision/LICENSE.txt` và đóng gói cùng mô hình.
- [Tài liệu chính thức và các model card](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker#models).
- [Face Mesh V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf) xác định giấy phép Apache 2.0.

## Ảnh kiểm thử

`tests/fixtures/astronaut.png` là ảnh NASA public domain qua scikit-image; ghi nguồn trong `tests/fixtures/README.md`. Ảnh chỉ dùng cho kiểm thử, không đóng gói vào app.

## OpenAI

Tạo ảnh là dịch vụ API bên ngoài theo tài khoản, phí và điều khoản OpenAI; không đóng gói trọng số mô hình tạo ảnh trong app. Xem [AI & Sticker](ai-stickers.md) để biết cách kết nối và xử lý dữ liệu.
