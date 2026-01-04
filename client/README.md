# Manage UR Plan

Electron.js tabanlı masaüstü uygulaması.

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Proje Yapısı

```
Manage-UR-Plan/
├── src/
│   ├── main.ts              # Ana Electron süreci
│   ├── core/
│   │   ├── WindowManager.ts # Pencere yönetimi
│   │   └── preload.ts       # Preload script
│   ├── services/
│   │   └── ApplicationService.ts
│   └── renderer/
│       ├── index.html
│       └── renderer.ts
├── dist/                    # Derlenmiş dosyalar
├── package.json
└── tsconfig.json
```

## Teknolojiler

- Electron.js
- TypeScript
- SOLID Prensipleri
- Multilayer Architecture

