# COMETA Worker Progress Tracking PWA

Progressive Web Application для отслеживания прогресса работ сотрудников COMETA.

## Технологии

- **Next.js 15** - React framework с App Router
- **TypeScript 5** - Типизация
- **Supabase** - Backend (PostgreSQL + Storage + Auth)
- **TanStack Query** - Управление состоянием и кэшированием
- **Tailwind CSS** - Стилизация
- **Radix UI** - Компоненты UI
- **PWA** - Офлайн-режим и установка на устройства

## Установка

### Требования

- Node.js 18+ и npm
- Supabase аккаунт ([создать бесплатно](https://supabase.com))

### Шаги установки

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Iacob98/worker-progress-tracking-pwa.git
cd worker-progress-tracking-pwa
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:
```bash
cp .env.example .env.local
```

Отредактируйте `.env.local` и добавьте ваши Supabase credentials.

4. Запустите dev-сервер:
```bash
npm run dev
```

Приложение будет доступно на порту, указанном в `.env.local` (по умолчанию: `http://localhost:3001`)

## Настройка порта

Вы можете изменить порт dev-сервера в файле `.env.local`:

```env
PORT=3001
```

или задать его временно через командную строку:

```bash
PORT=3002 npm run dev
```

## Скрипты

- `npm run dev` - Запуск dev-сервера
- `npm run build` - Сборка production
- `npm start` - Запуск production сервера
- `npm run lint` - Проверка кода
- `npm run type-check` - Проверка типов
- `npm test` - Запуск тестов

## Структура проекта

```
app/                      # Next.js App Router страницы
  (app)/                 # Защищенные страницы (требуют авторизации)
    projects/            # Управление проектами
    work-entries/        # Отчеты о работах
    approvals/           # Одобрение работ
  (auth)/                # Страницы авторизации
components/              # React компоненты
lib/                     # Утилиты и хуки
  hooks/                # React Query хуки
  supabase/             # Supabase клиенты
  utils/                # Утилиты
types/                   # TypeScript типы
database/                # SQL миграции
```

## Конфигурация

### Переменные окружения

Все переменные окружения настраиваются через файл `.env.local`:

- `PORT` - Порт dev-сервера (default: 3000)
- `NEXT_PUBLIC_SUPABASE_URL` - URL вашего Supabase проекта
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key из Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key из Supabase

Полный список см. в [.env.example](.env.example)

### Supabase Storage

Приложение использует следующие bucket'ы в Supabase Storage:
- `project-photos` - Фотографии проектов
- `work-photos` - Фотографии работ
- `project-documents` - Документы проектов
- `house-documents` - Документы домов
- `user-avatars` - Аватары пользователей
- `reports` - Отчеты

## PWA

Приложение поддерживает Progressive Web App функциональность:
- Установка на устройства (iOS, Android, Desktop)
- Офлайн-режим
- Service Worker для кэширования
- Push-уведомления (в разработке)

## Deployment

### Vercel (рекомендуется)

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения в Vercel Dashboard
3. Deploy

### Другие платформы

Приложение может быть развернуто на любой платформе, поддерживающей Next.js:
- Netlify
- Railway
- Render
- DigitalOcean App Platform

## Лицензия

Proprietary - COMETA
