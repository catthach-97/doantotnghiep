@echo off
echo 🔄 Đang khởi động MongoDB...
echo.

REM Thử khởi động MongoDB service
net start MongoDB 2>nul
if %errorlevel% == 0 (
    echo ✅ Đã khởi động MongoDB service thành công!
) else (
    echo ⚠️  Không thể khởi động MongoDB service
    echo 💡 Vui lòng kiểm tra:
    echo    1. MongoDB đã được cài đặt chưa
    echo    2. Chạy Command Prompt với quyền Administrator
    echo    3. Hoặc khởi động MongoDB Compass
    echo.
    echo 🔄 Đang thử khởi động MongoDB trực tiếp...
    
    REM Thử khởi động MongoDB trực tiếp
    start "MongoDB" mongod --dbpath "C:\data\db" --port 27017
    if %errorlevel% == 0 (
        echo ✅ Đã khởi động MongoDB thành công!
    ) else (
        echo ❌ Không thể khởi động MongoDB
        echo 💡 Vui lòng cài đặt MongoDB hoặc sử dụng MongoDB Compass
    )
)

echo.
echo 🔄 Đang chờ MongoDB khởi động...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Đang import dữ liệu...
node scripts/import-all-data.js

echo.
echo ✅ Hoàn thành!
pause
