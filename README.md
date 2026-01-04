# Manage UR Plan

Electron tabanlı masaüstü plan yönetim uygulaması.

## Gereksinimler

- Node.js (v18+)
- Docker ve Docker Compose
- npm veya yarn

## Kurulum

### 1. PostgreSQL Veritabanını Başlat

```bash
docker-compose up -d
```

Bu komut PostgreSQL veritabanını Docker container'ında başlatır.

### 2. Bağımlılıkları Yükle

```bash
cd client
npm install
```

### 3. Uygulamayı Derle ve Çalıştır

```bash
npm run build
npm run dev
```

## Veritabanı Yapılandırması

Varsayılan veritabanı ayarları:

- **Host**: localhost
- **Port**: 5432
- **Database**: manage_ur_plan
- **User**: manageurplan
- **Password**: manageurplan123

Bu ayarları değiştirmek için environment variables kullanabilirsiniz:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=manage_ur_plan
DB_USER=manageurplan
DB_PASSWORD=manageurplan123
```

## Proje Yapısı

```
client/
├── src/
│   ├── components/      # UI bileşenleri
│   ├── config/          # Yapılandırma dosyaları
│   ├── database/         # Veritabanı bağlantı yönetimi
│   ├── hooks/           # Custom hooks
│   ├── managers/        # State yönetimi
│   ├── models/          # Veri modelleri
│   ├── repositories/    # Veri erişim katmanı
│   ├── services/        # İş mantığı katmanı
│   └── renderer/        # Renderer process
├── database/            # SQL migration dosyaları
└── docker-compose.yml   # Docker yapılandırması
```

## Mimari

Uygulama multilayer architecture prensiplerine göre tasarlanmıştır:

- **Repository Layer**: Veri erişim katmanı (PostgreSQL)
- **Service Layer**: İş mantığı katmanı
- **Component Layer**: UI bileşenleri
- **Hook Layer**: Custom hooks (state yönetimi)

SOLID prensipleri ve dependency injection kullanılmıştır.

## Geliştirme

### Watch Mode

```bash
npm run watch
```

Bu komut TypeScript dosyalarını otomatik olarak derler.

### Build

```bash
npm run build
```

## Lisans

MIT

# MURP
