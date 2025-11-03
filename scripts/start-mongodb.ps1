Write-Host "🔄 Đang khởi động MongoDB..." -ForegroundColor Yellow

# Thử khởi động MongoDB service
try {
    Start-Service -Name "MongoDB" -ErrorAction Stop
    Write-Host "✅ Đã khởi động MongoDB service thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Không thể khởi động MongoDB service" -ForegroundColor Yellow
    Write-Host "💡 Vui lòng kiểm tra:" -ForegroundColor Cyan
    Write-Host "   1. MongoDB đã được cài đặt chưa" -ForegroundColor White
    Write-Host "   2. Chạy PowerShell với quyền Administrator" -ForegroundColor White
    Write-Host "   3. Hoặc khởi động MongoDB Compass" -ForegroundColor White
    
    Write-Host "`n🔄 Đang thử khởi động MongoDB trực tiếp..." -ForegroundColor Yellow
    
    # Thử khởi động MongoDB trực tiếp
    try {
        Start-Process -FilePath "mongod" -ArgumentList "--dbpath", "C:\data\db", "--port", "27017" -WindowStyle Hidden
        Write-Host "✅ Đã khởi động MongoDB thành công!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Không thể khởi động MongoDB" -ForegroundColor Red
        Write-Host "💡 Vui lòng cài đặt MongoDB hoặc sử dụng MongoDB Compass" -ForegroundColor Cyan
        return
    }
}

Write-Host "`n🔄 Đang chờ MongoDB khởi động..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n🚀 Đang import dữ liệu..." -ForegroundColor Green
node scripts/import-all-data.js

Write-Host "`n✅ Hoàn thành!" -ForegroundColor Green
Read-Host "Nhấn Enter để thoát"
