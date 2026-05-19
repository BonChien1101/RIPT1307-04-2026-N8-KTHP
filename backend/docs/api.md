# API cho hệ thống mượn thiết bị CLB

Tài liệu này để **frontend và backend làm song song**. FE chỉ cần bám theo các endpoint + format response ở đây là làm được UI/service.

- DB hiện tại: MySQL (Sequelize), schema ở `backend/schema.sql`
- Response JSON: giữ ổn định để FE không phải sửa lắt nhắt

## 0) Thông tin chung

- Base URL (local): `http://localhost:{PORT}` (mặc định PORT hay dùng: `5000`)
- Prefix: `/api`
- Content-Type: `application/json`

## 1) Quy ước response

### Thành công

```json
{ "success": true, "message": "OK", "data": {} }
```

- `message`: để hiển thị toast/snackbar.
- `data`: dữ liệu trả về.

### Thất bại

```json
{ "success": false, "message": "...", "errorCode": "...", "errors": [] }
```

- `errorCode`: string để FE map theo case.
- `errors` (tuỳ chọn): mảng lỗi validation dạng `{ field, message }`.

### Bảng errorCode chung

| HTTP | errorCode | Dùng khi |
|---:|---|---|
| 400 | VALIDATION_ERROR | Body/query sai, thiếu field |
| 401 | AUTH_REQUIRED | Chưa đăng nhập |
| 401 | AUTH_INVALID_TOKEN | Token sai/hết hạn |
| 401 | AUTH_INVALID_CREDENTIALS | Sai email/mật khẩu |
| 403 | FORBIDDEN | Đăng nhập rồi nhưng không đủ quyền |
| 404 | NOT_FOUND | Không tìm thấy dữ liệu |
| 409 | CONFLICT | Xung đột dữ liệu/ràng buộc |
| 500 | INTERNAL_ERROR | Lỗi server |

## 2) Auth (JWT)

- Header: `Authorization: Bearer <token>`
- Role: `student` / `admin`

### 2\.1 POST `/api/auth/login`

- Auth: không
- Role: mọi người

**Body**
```json
{ "email": "admin@example.com", "password": "123456" }
```

**200**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "<jwt>",
    "user": { "id": 1, "full_name": "Admin", "email": "admin@example.com", "role": "admin" }
  }
}
```

### 2\.2 GET `/api/auth/me`

- Auth: có
- Role: student/admin

**200**
```json
{ "success": true, "message": "OK", "data": { "id": 1, "full_name": "Admin", "email": "admin@example.com", "role": "admin" } }
```

## 3) Thiết bị (Equipments)

### 3\.1 GET `/api/equipments`

- Auth: có (khuyến nghị). Nếu muốn public thì backend có thể bỏ auth sau.
- Role: student/admin

**Query (tuỳ chọn)**
- `q`: tìm theo tên
- `status`: `available|maintenance|unavailable`
- `onlyAvailable`: `true|false` (lọc `available_quantity > 0`)

**200 (ví dụ)**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "Projector Epson",
      "category": "Presentation",
      "description": "Máy chiếu phục vụ thuyết trình",
      "total_quantity": 5,
      "available_quantity": 5,
      "image_url": null,
      "status": "available",
      "created_at": "2026-05-19T00:00:00.000Z",
      "updated_at": "2026-05-19T00:00:00.000Z"
    }
  ]
}
```

### 3\.2 GET `/api/equipments/:id`

- Auth: có
- Role: student/admin

### 3\.3 POST `/api/equipments`

- Auth: có
- Role: admin

**Body (ví dụ)**
```json
{
  "name": "Loa JBL",
  "category": "Audio",
  "description": "...",
  "total_quantity": 2,
  "available_quantity": 2,
  "image_url": null,
  "status": "available"
}
```

### 3\.4 PUT `/api/equipments/:id`

- Auth: có
- Role: admin

### 3\.5 DELETE `/api/equipments/:id`

- Auth: có
- Role: admin

## 4) Yêu cầu mượn (Borrow requests)

> Liên quan bảng: `borrow_requests`, `borrow_items`.

### 4\.1 POST `/api/borrow-requests`

- Auth: có
- Role: student

**Body**
```json
{
  "borrow_date": "2026-05-19",
  "expected_return_date": "2026-05-26",
  "note": "Mượn để làm bài thuyết trình",
  "items": [
    { "equipment_id": 1, "quantity": 1 },
    { "equipment_id": 2, "quantity": 2 }
  ]
}
```

**201**
```json
{ "success": true, "message": "Tạo yêu cầu mượn thành công", "data": { "id": 10, "status": "pending" } }
```

### 4\.2 GET `/api/borrow-requests/me`

- Auth: có
- Role: student

**Query (tuỳ chọn)**
- `status`: `pending|approved|rejected|returned|overdue|lost|damaged`

### 4\.3 GET `/api/borrow-requests`

- Auth: có
- Role: admin

**Query (tuỳ chọn)**
- `status`: lọc theo trạng thái
- `from`, `to`: lọc theo ngày mượn (yyyy-mm-dd)

### 4\.4 GET `/api/borrow-requests/:id`

- Auth: có
- Role: admin (hoặc student là chủ request)

### 4\.5 PATCH `/api/borrow-requests/:id/approve`

- Auth: có
- Role: admin

**Body (tuỳ chọn)**
```json
{ "note": "Duyệt" }
```

**200**
```json
{ "success": true, "message": "Đã duyệt yêu cầu", "data": { "id": 10, "status": "approved" } }
```

### 4.6 PATCH `/api/borrow-requests/:id/reject`

- Auth: có
- Role: admin

**Body**
```json
{ "note": "Thiết bị không đủ số lượng" }
```

### 4.7 PATCH `/api/borrow-requests/:id/mark-returned`

- Auth: có
- Role: admin

**Body (tuỳ chọn)**
```json
{ "actual_return_date": "2026-05-25", "note": "Đã trả đủ" }
```

## 5) Thông báo (Notifications)

### 5.1 GET `/api/notifications`

- Auth: có
- Role: student/admin

### 5.2 PATCH `/api/notifications/:id/read`

- Auth: có
- Role: student/admin

## 6) Thống kê (Statistics)

### 6.1 GET `/api/statistics/top-borrowed`

- Auth: có
- Role: admin

**Query**
- `month`: 1-12
- `year`: yyyy
- `limit` (tuỳ chọn)

**200 (ví dụ)**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "equipment_id": 2, "name": "Micro không dây", "borrow_count": 7 }
  ]
}
```

## Ghi chú nghiệp vụ (để FE hiển thị đúng)

- Student tạo yêu cầu → `pending`
- Admin duyệt → `approved`
- Admin ghi nhận trả → `returned` + set `actual_return_date`
- `overdue` dùng cho cảnh báo quá hạn (cron/job)

Gợi ý: nếu muốn tách rõ “đã phát đồ” và “đã trả”, có thể bổ sung trạng thái `borrowed` vào schema (không bắt buộc).
