# Deploy backend (Express + MySQL)

Backend này chạy bằng Node/Express và cần MySQL.

## Biến môi trường cần có

- `PORT` (platform thường tự set, local có thể dùng 5000)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL` (tuỳ chọn)
- `DB_CA_CERT` (tuỳ chọn)
- `JWT_SECRET`
- `CORS_ORIGINS` (khuyến nghị khi deploy)

### Aiven MySQL (ssl-mode=REQUIRED)

Nếu bạn dùng Aiven MySQL và thấy `ssl-mode=REQUIRED` trong “Connection information”:

- set `DB_SSL=true`
- (khuyến nghị) copy nội dung **CA certificate** (PEM) vào `DB_CA_CERT`

Render hỗ trợ env multiline. Nếu bạn paste PEM nhiều dòng mà bị lỗi, hãy giữ nguyên đúng format:

- `-----BEGIN CERTIFICATE-----`
- ...
- `-----END CERTIFICATE-----`

`CORS_ORIGINS` là danh sách domain cách nhau bằng dấu phẩy. Ví dụ:

- `https://your-site.netlify.app,https://main--your-site.netlify.app`

Nếu để trống `CORS_ORIGINS` thì API sẽ cho phép tất cả origin (tiện dev, không khuyến nghị production).

## Chạy local

```powershell
cd backend
npm install
npm run dev
```

## Deploy gợi ý (Render/Railway)

Thiết lập chung:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Sau khi deploy xong, lấy API base URL:

- `https://<your-backend-domain>/api`


## Import schema lên DB online

Với DB managed (Aiven/...), thường bạn **không có quyền** `CREATE DATABASE`.

- Hãy chọn đúng database (ví dụ `defaultdb`) rồi chạy file `backend/schema.sql`.
- File `schema.sql` trong repo đã bỏ phần `CREATE DATABASE/USE` để chạy được trên DB managed.

### Chạy bằng script trong backend

```powershell
cd backend
npm run db:schema
npm run db:migrate
npm run db:seed
```

- `db:schema`: import toàn bộ schema hiện tại trong `schema.sql`
- `db:migrate`: chuyển `equipments.category` sang `categories.id` khi cần
- `db:seed`: nạp dữ liệu mẫu

Khuyến nghị backup trước khi chạy `db:migrate` trên DB đang có dữ liệu thật.
