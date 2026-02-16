# Как привязать панель к API (пошагово)

## Схема

- **Панель** открывается по адресу: `https://panel.runafinance.online`
- **API** уже работает по адресу: `https://api.runafinance.online`
- Привязка = при сборке панели указать, что все запросы идут на `https://api.runafinance.online/api`

---

## Шаг 1. Указать адрес API при сборке

На своём ПК в папке **panel-runa** создайте файл **.env** (если его ещё нет):

```
VITE_API_URL=https://api.runafinance.online
```

Важно: без `https://` в конце, без `/api` — только база: `https://api.runafinance.online`.

В коде панели к этому значению автоматически добавляется `/api`, поэтому запросы пойдут на:
- `https://api.runafinance.online/api/admin/auth/login`
- `https://api.runafinance.online/api/admin/me`
- и т.д.

---

## Шаг 2. Собрать панель

В папке **panel-runa** выполните:

```bash
npm install
npm run build
```

После сборки в папке **dist/** будут файлы: `index.html`, папка `assets/` и т.д. Эти файлы нужно выложить на сервер.

---

## Шаг 3. Выложить панель на сервер

Скопируйте **всё содержимое** папки **dist/** на сервер в каталог, откуда будет раздаваться сайт **panel.runafinance.online**.

Примеры:

- **SCP** (подставьте свой IP и путь):
  ```bash
  scp -r dist/* root@ВАШ_IP:/var/www/panel/
  ```
- Или через **SFTP/ФТП** (FileZilla и т.п.): загрузить содержимое `dist/` в нужную папку на хостинге.

Если панель привязана к проекту «Ambitious Umbriel» — в настройках этого проекта укажите **корневую папку** как ту, куда вы загрузили файлы из `dist/`.

---

## Шаг 4. DNS для panel.runafinance.online

В TurboFlare (или у регистратора домена) должна быть запись для поддомена **panel**:

- Тип: **A**
- Имя: **panel** (или полное имя, как требует панель)
- Значение: **IP сервера**, куда вы залили панель (тот же, что у runafinance.online, или другой — смотря где хостится панель)

Без этой записи браузер не найдёт panel.runafinance.online.

---

## Шаг 5. Бэкенд (API) должен разрешать запросы с панели (CORS)

На сервере, где крутится **backend-runa**, в файле **.env** проверьте:

- Либо **CORS_ORIGIN=*** — тогда разрешены все домены.
- Либо список через запятую, в котором есть **https://panel.runafinance.online**.

В коде бэкенда уже добавлен `https://panel.runafinance.online` в разрешённые origins. После перезапуска бэкенда запросы с панели не будут блокироваться.

---

## Шаг 6. Проверка

1. Откройте в браузере: **https://panel.runafinance.online**
2. Должна открыться страница входа в админ-панель.
3. Введите email и пароль админа (созданного командой `docker compose ... exec backend node scripts/create-admin.js ...`).
4. Если вход прошёл — панель привязана к API, запросы уходят на **https://api.runafinance.online/api**.

---

## Локальная разработка (без привязки к прод API)

Локально панель запускается так:

```bash
npm run dev
```

Откроется **http://localhost:5174**. Запросы пойдут на **/api** и через настройки Vite будут проксироваться на **http://localhost:3000** (ваш локальный бэкенд). Файл **.env** с `VITE_API_URL` при `npm run dev` можно не использовать или задать `VITE_API_URL=http://localhost:3000`, если хотите явно ходить на локальный API.

---

## Краткий чеклист

| Шаг | Действие |
|-----|----------|
| 1 | В panel-runa создать .env с `VITE_API_URL=https://api.runafinance.online` |
| 2 | Выполнить `npm run build` в panel-runa |
| 3 | Залить содержимое папки dist/ на сервер в каталог для panel.runafinance.online |
| 4 | В DNS: A-запись panel → IP сервера |
| 5 | На бэкенде: CORS разрешает panel.runafinance.online (или *) |
| 6 | Открыть https://panel.runafinance.online и войти под админом |

После этого панель привязана к API и готова к работе.
