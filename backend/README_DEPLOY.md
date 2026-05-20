# Deploy backend (Express + MySQL)

Backend này chạy bằng Node/Express và cần MySQL.

## Biến môi trường cần có

- `PORT` (platform thường tự set, local có thể dùng 5000)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS` (khuyến nghị khi deploy)

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

Gửi URL này cho team frontend cấu hình biến môi trường trên Netlify.
