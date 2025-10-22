# Настройка авторизации

## Изменения в авторизации

Система авторизации была изменена для работы напрямую с таблицей `users` вместо Supabase Auth.

### Как работает новая авторизация:

1. **Вход (Login):**
   - Проверяется email и PIN напрямую в таблице `users`
   - PIN хранится в поле `pin_code` (VARCHAR)
   - Создается сессия в `localStorage` со сроком действия 7 дней

2. **Сессия:**
   - Хранится в `localStorage` (ключ: `worker_session`)
   - Содержит `workerId` и `timestamp`
   - Автоматически проверяется при загрузке приложения
   - Истекает через 7 дней

3. **Проверка прав:**
   - Роль: только `worker`, `foreman`, или `crew`
   - Статус: `is_active = true`

## Требования к базе данных

### Добавить поле pin_code в таблицу users

Выполните SQL миграцию:

```sql
-- Добавить колонку pin_code
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- Добавить комментарий
COMMENT ON COLUMN users.pin_code IS 'PIN code for mobile app authentication (4-6 digits)';
```

### Установить PIN для пользователя

Для тестового пользователя K1_4@kometa.com:

```sql
UPDATE users
SET pin_code = '6850'
WHERE email = 'K1_4@kometa.com';
```

### Проверить данные пользователя

```sql
SELECT id, email, pin_code, role, is_active, first_name, last_name
FROM users
WHERE email = 'K1_4@kometa.com';
```

Убедитесь что:
- ✅ `pin_code = '6850'`
- ✅ `role = 'worker'`, `'foreman'`, или `'crew'`
- ✅ `is_active = true`

## Тестирование

### 1. Запустите приложение:
```bash
npm run dev
```

### 2. Откройте в браузере:
```
http://localhost:3000/login
```

### 3. Войдите с данными:
- **Email:** K1_4@kometa.com
- **PIN:** 6850

### 4. Проверьте:
- ✅ Успешный вход
- ✅ Редирект на `/projects`
- ✅ Имя пользователя отображается
- ✅ Кнопка "Выйти" работает

## Структура сессии

### localStorage ключи:

**worker_session:**
```json
{
  "workerId": "uuid",
  "timestamp": 1729087654321
}
```

**cached_worker:**
```json
{
  "id": "uuid",
  "email": "K1_4@kometa.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "role": "worker",
  "phone": "+7...",
  "isActive": true,
  "languagePreference": "ru",
  "skills": {}
}
```

## Безопасность

⚠️ **Важно:**

1. **PIN должен быть строкой** (VARCHAR), не числом
2. **Сессия клиентская** - хранится в localStorage
3. **Нет серверной валидации** в middleware (защита только на клиенте)
4. Для production рекомендуется:
   - Хешировать PIN (bcrypt)
   - Добавить JWT токены
   - Проверять сессию на сервере

## Offline поддержка

Авторизация работает offline:
- ✅ Сессия хранится в localStorage
- ✅ Данные worker кэшируются
- ✅ Срок действия 7 дней
- ✅ Автоматическое восстановление при перезагрузке

## Выход (Logout)

При выходе очищаются:
- `localStorage.worker_session`
- `localStorage.cached_worker`
- Все черновики отчетов (если нужно сохранить - отключите)

## Troubleshooting

### Проблема: "Неверный email или PIN"

**Проверьте:**
```sql
SELECT email, pin_code FROM users WHERE email = 'K1_4@kometa.com';
```

- PIN должен точно совпадать (регистр важен)
- Нет пробелов в начале/конце PIN

### Проблема: "Аккаунт деактивирован"

**Проверьте:**
```sql
SELECT is_active FROM users WHERE email = 'K1_4@kometa.com';
```

Установите `is_active = true`:
```sql
UPDATE users SET is_active = true WHERE email = 'K1_4@kometa.com';
```

### Проблема: "У вас нет доступа"

**Проверьте роль:**
```sql
SELECT role FROM users WHERE email = 'K1_4@kometa.com';
```

Должно быть `worker`, `foreman`, или `crew`:
```sql
UPDATE users SET role = 'worker' WHERE email = 'K1_4@kometa.com';
-- или
UPDATE users SET role = 'crew' WHERE email = 'K1_4@kometa.com';
```

### Проблема: Бесконечный редирект

Очистите localStorage:
```javascript
localStorage.clear()
```

Затем перезагрузите страницу.

## API Reference

### signIn(email, pin)

```typescript
const { error } = await signIn('K1_4@kometa.com', '6850')

if (error) {
  console.error(error.message)
} else {
  // Success - redirected to /projects
}
```

### signOut()

```typescript
await signOut()
// Cleared session and redirected to /login
```

### useAuth hook

```typescript
const { worker, loading } = useAuth()

if (loading) return <Spinner />
if (!worker) return <Redirect to="/login" />

return <Dashboard worker={worker} />
```
