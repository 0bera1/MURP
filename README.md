# Manage UR Plan (MURP)

Electron tabanlı masaüstü plan yönetim uygulaması.

## Gereksinimler

- Node.js (v18+)
- Docker ve Docker Compose
- npm veya yarn

## Kurulum

### 1. PostgreSQL Veritabanını Başlat

Proje kök dizininde Docker Compose ile PostgreSQL veritabanını başlatın:

```bash
docker-compose up -d
```

Bu komut PostgreSQL 16 Alpine image'ını kullanarak veritabanını Docker container'ında başlatır ve otomatik olarak:
- Veritabanını oluşturur
- `database/` klasöründeki tüm SQL dosyalarını (init.sql ve migration'ları) alfabetik sırayla çalıştırır

**Container Durumunu Kontrol Etme:**

```bash
docker-compose ps
```

**Logları Görüntüleme:**

```bash
docker-compose logs postgres
```

**Container'ı Durdurma:**

```bash
docker-compose down
```

**Veritabanı Verilerini Silmeden Container'ı Durdurma:**

```bash
docker-compose stop
```

**Veritabanı Verilerini de Silerek Container'ı Durdurma:**

```bash
docker-compose down -v
```

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

### Docker Compose ile Otomatik Yapılandırma

Varsayılan veritabanı ayarları (`docker-compose.yml` içinde tanımlı):

- **Host**: localhost
- **Port**: 5432
- **Database**: manage_ur_plan
- **User**: manageurplan
- **Password**: manageurplan123

### Migration Dosyaları

`database/` klasöründeki SQL dosyaları container ilk başlatıldığında otomatik olarak çalıştırılır:

- `init.sql` - Temel tablo yapılarını oluşturur
- `migration_001_add_plan_name_and_description.sql` - Plan adı ve açıklama alanlarını ekler
- `migration_002_remove_year_week_unique_add_plan_name_unique.sql` - Unique constraint'leri günceller
- `migration_003_create_settings_table.sql` - Ayarlar tablosunu oluşturur

**Not:** Migration dosyaları alfabetik sırayla çalıştırılır. Yeni migration eklerken dosya adlarını buna göre düzenleyin.

### Environment Variables ile Yapılandırma

Uygulama içinde bu ayarları değiştirmek için environment variables kullanabilirsiniz:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=manage_ur_plan
DB_USER=manageurplan
DB_PASSWORD=manageurplan123
```

## Proje Yapısı

```
MURP/
├── client/                      # Electron uygulaması
│   ├── src/
│   │   ├── components/         # UI bileşenleri
│   │   ├── config/             # Yapılandırma dosyaları
│   │   ├── core/               # Electron core dosyaları
│   │   ├── database/           # Veritabanı bağlantı yönetimi
│   │   ├── hooks/              # Custom React hooks
│   │   ├── managers/           # State yönetimi
│   │   ├── models/             # Veri modelleri
│   │   ├── repositories/       # Veri erişim katmanı
│   │   ├── services/           # İş mantığı katmanı
│   │   └── renderer/           # Renderer process
│   ├── dist/                   # Derlenmiş dosyalar
│   └── package.json
├── database/                    # SQL migration dosyaları
│   ├── init.sql
│   ├── migration_001_add_plan_name_and_description.sql
│   ├── migration_002_remove_year_week_unique_add_plan_name_unique.sql
│   └── migration_003_create_settings_table.sql
└── docker-compose.yml          # Docker yapılandırması
```

## Mimari

Uygulama multilayer architecture prensiplerine göre tasarlanmıştır:

- **Repository Layer**: Veri erişim katmanı (PostgreSQL)
- **Service Layer**: İş mantığı katmanı
- **Component Layer**: UI bileşenleri (React)
- **Hook Layer**: Custom hooks (state yönetimi)

### Prensipler

- **SOLID**: Tüm katmanlarda SOLID prensipleri uygulanmıştır
- **Dependency Injection**: Constructor injection ile bağımlılık yönetimi
- **Interface-based Design**: Interface'ler üzerinden bağımlılık yönetimi
- **No ORM**: Doğrudan SQL sorguları kullanılır
- **Access Modifiers**: TypeScript access modifier'ları kullanılır

## Geliştirme

### Watch Mode

TypeScript dosyalarını otomatik olarak derlemek için:

```bash
npm run watch
```

### Build

Uygulamayı derlemek için:

```bash
npm run build
```

Bu komut:
1. TypeScript dosyalarını derler
2. HTML dosyalarını kopyalar
3. AppSettings modelini düzeltir

### Development Mode

```bash
npm run dev
```

## Sorun Giderme

### Docker Container Başlatılamıyor

**Hata:** `mount failed: not a directory`

**Çözüm:** `docker-compose.yml` dosyasında volume mount'ları kontrol edin. Klasör mount'u kullanıldığından emin olun.

**Hata:** `container name already in use`

**Çözüm:** Eski container'ı kaldırın:
```bash
docker rm -f manage-ur-plan-db
docker-compose up -d
```

### Veritabanı Bağlantı Sorunları

Container'ın çalıştığını kontrol edin:
```bash
docker ps -a --filter name=manage-ur-plan-db
```

Veritabanı loglarını kontrol edin:
```bash
docker-compose logs postgres
```

Veritabanına bağlanmayı test edin:
```bash
docker exec -it manage-ur-plan-db psql -U manageurplan -d manage_ur_plan
```

## Lisans

MIT
