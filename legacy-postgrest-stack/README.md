# Legacy PostgREST & Express Server Stack

Thư mục này chứa các thành phần thuộc cấu trúc máy chủ cũ (Legacy Stack) của dự án. 

### Các tệp tin bao gồm:
- `docker-compose.yml`: Khởi chạy container PostgreSQL và PostgREST (cổng 3000).
- `postgrest.exe` & `postgrest.conf`: Bộ máy PostgREST nhị phân chạy độc lập.
- `server.cjs`: Máy chủ Express/Node.js đóng vai trò mock API và chatbot.

---

> [!WARNING]
> **DỰ ÁN HIỆN TẠI KHÔNG DÙNG CỤM NÀY NỮA**. 
> Hệ thống chính đã được nâng cấp lên chạy **ASP.NET Core C# Backend (`TMPMS_BE`)** kết nối trực tiếp với **SQL Server** tại địa chỉ **`http://localhost:5000`**. 
> Vui lòng không khởi chạy các tệp tin này để tránh xung đột cổng hoặc sai lệch dữ liệu.
