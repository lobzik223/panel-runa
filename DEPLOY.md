# Деплой админ-панели на panel.runafinance.online

## 1. DNS (TurboFlare или регистратор)

Нужно, чтобы поддомен **panel.runafinance.online** указывал на сервер, где будет отдаваться панель.

- Если панель будет на **том же сервере**, что и основной сайт runafinance.online:
  - Добавьте **A-запись**: имя `panel`, значение — **IP сервера** (например `151.236.109.225` или `62.152.61.236`, как у runafinance.online).
- Если панель на **отдельном сервере** (как API на 109.71.240.212):
  - **A-запись**: имя `panel`, значение — IP этого сервера.

В TurboFlare: «Добавить набор записей» → тип **A**, название **panel** (или `panel.runafinance.online` в зависимости от интерфейса), содержимое — IP. TTL можно оставить 1 ч.

## 2. Сборка панели (у себя на ПК)

В папке **panel-runa**:

```bash
cd panel-runa
npm install
```

Создайте файл **.env** (скопируйте из .env.example):

```bash
echo "VITE_API_URL=https://api.runafinance.online" > .env
```

Соберите проект:

```bash
npm run build
```

В папке **dist/** появятся готовые файлы (index.html, assets/...). Их нужно загрузить на сервер.

## 3. Загрузка на сервер

Скопируйте **содержимое** папки `dist/` на сервер в каталог, из которого будет раздаваться панель. Пример по SCP (подставьте свой пользователь и хост):

```bash
scp -r dist/* root@151.236.109.225:/var/www/panel/
```

Или через SFTP/ФТП в тот же каталог (например `/var/www/panel/` или `~/panel/`).

## 4. Nginx на сервере

На сервере, куда указывает **panel.runafinance.online**, должен быть настроен веб-сервер. Пример для Nginx:

```nginx
server {
    listen 80;
    server_name panel.runafinance.online;

    root /var/www/panel;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        return 404;
    }
}
```

- **root** — путь к папке, куда вы положили файлы из `dist/` (например `/var/www/panel`).
- **try_files ... /index.html** — для SPA: все маршруты (например `/login`, `/users`) отдаёт index.html.
- Запросы к `/api` на панели уходят на **api.runafinance.online** (задаётся через `VITE_API_URL` при сборке), поэтому локально `/api` можно закрыть 404.

Если используете HTTPS (рекомендуется), добавьте сертификат (Let's Encrypt) и блок `listen 443 ssl;` с `ssl_certificate` и `ssl_certificate_key`, либо настройку выдаст панель хостинга.

Перезапуск Nginx после правок:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Проверка

1. Откройте в браузере: **https://panel.runafinance.online** (или http, если SSL ещё не настроен).
2. Должна открыться страница входа в админ-панель.
3. Вход по email и паролю админа, созданного на бэкенде (через `scripts/create-admin.js`).

## 6. Поддомен в панели хостинга («Привязан к Ambitious Umbriel»)

Если у вас панель хостинга (Timeweb и т.п.) и поддомен **panel.runafinance.online** уже привязан к проекту «Ambitious Umbriel»:

- Убедитесь, что в **DNS** (вкладка DNS у домена) есть запись для **panel** с правильным IP или CNAME на тот сервер/хостинг, где лежит проект.
- В настройках этого проекта укажите **корневую папку** как каталог с собранной панелью (те же файлы из `dist/`: index.html и папка assets).
- Если хостинг сам выдаёт HTTPS и прокси — достаточно залить файлы в нужную папку и проверить, что в сборке задан `VITE_API_URL=https://api.runafinance.online`.

Итого: **DNS** → **сборка с VITE_API_URL** → **загрузка dist на сервер** → **Nginx (или панель хостинга) отдаёт папку с index.html**. После этого панель будет открываться по адресу panel.runafinance.online и ходить за данными на api.runafinance.online.

## 7. Бэкенд (api.runafinance.online)

В `.env` бэкенда переменная **CORS_ORIGIN** может быть:
- `*` — разрешены все домены (подходит и для панели);
- или список через запятую, например: `https://runafinance.online,https://panel.runafinance.online`.

В коде бэкенда уже добавлен `https://panel.runafinance.online` в список разрешённых origins при не-звёздочке. После деплоя бэкенда запросы с панели не будут блокироваться CORS.
