# Запуск на своём сервере (VPS)

Вне Реплита нет его хранилища файлов, поэтому PDF заказов сохраняются на диск
сервера. Включается переменными окружения. В Реплите ничего не меняется: если
`STORAGE_DRIVER` не задан, работает как раньше.

## Переменные окружения API

```
NODE_ENV=production
PORT=8080
BASE_PATH=/
DATABASE_URL=postgresql://bamboo:ПАРОЛЬ@localhost/bamboo_db
SESSION_SECRET=длинная_случайная_строка   # openssl rand -hex 32
MANAGER_PASSWORD=пароль_главного_администратора
ALLOWED_ORIGINS=designella.ru,www.designella.ru

STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=/var/www/bamboo-uploads
UPLOAD_SIGNING_SECRET=длинная_случайная_строка   # openssl rand -hex 32
```

`ALLOWED_ORIGINS` обязателен: браузер отправляет заголовок Origin даже при
запросах к своему же сайту, и без этого списка сохранение КП и вход менеджера
будут отклонены. Новые домены (например, поддомен заказчика) добавляются через
запятую.

## Сборка

```
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/bamboo-studio run build
```

## nginx

Сайт: `artifacts/bamboo-studio/dist/public`, запросы `/api/` проксируются на
`127.0.0.1:8080`. Нужен `client_max_body_size 20m;` (PDF до 15 МБ).

## Автообновление

Сервер раз в минуту проверяет ветку `ver4.0` на GitHub. При новом коммите
он ставит зависимости, проверяет типы, собирает сайт, применяет изменения
схемы базы, пересобирает API и перезапускает его. Если любой шаг не прошёл,
восстанавливается предыдущая версия, а неудачный коммит не повторяется,
пока не появится новый.

Установка (один раз): `bash /var/www/bamboo/scripts/vps/install-autodeploy.sh`
Журнал: `tail -f /var/log/bamboo-deploy.log`
Вручную: `bamboo-deploy --force`
Приостановить: `systemctl stop bamboo-deploy.timer` (включить: `start`)

Изменения схемы базы, которые drizzle-kit считает опасными (удаление
колонок или таблиц), автоматически не применяются: обновление откатится,
и такое изменение нужно применить вручную.
