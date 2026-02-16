# SSL для panel.runafinance.online

Чтобы админ-панель открывалась по HTTPS (без предупреждения «Не защищено»), нужен отдельный сертификат для поддомена **panel.runafinance.online**.

## Предусловия

- Домен **panel.runafinance.online** указывает на IP твоего сервера (A-запись в DNS).
- Nginx установлен, каталог `/var/www/certbot` уже есть (если настраивал api).

---

## 1. Собрать панель и положить файлы на сервер

На сервере (или локально, потом залить):

```bash
cd /path/to/panel-runa
npm ci
npm run build
sudo mkdir -p /var/www/panel-runa
sudo cp -r dist/* /var/www/panel-runa/
sudo chown -R www-data:www-data /var/www/panel-runa
```

---

## 2. Временный Nginx (только порт 80)

```bash
sudo cp nginx.conf.ssl-bootstrap /etc/nginx/sites-available/panel.runafinance.online
sudo ln -sf /etc/nginx/sites-available/panel.runafinance.online /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Проверка: открой в браузере `http://panel.runafinance.online` — должна открыться панель (предупреждение «Не защищено» пока нормально).

---

## 3. Получить сертификат для panel

```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d panel.runafinance.online \
  --email your@email.com \
  --agree-tos \
  --no-eff-email
```

Замени `your@email.com` на свой email. После успеха сертификаты будут в:
`/etc/letsencrypt/live/panel.runafinance.online/`.

---

## 4. Включить полный конфиг с HTTPS

```bash
sudo cp nginx.conf /etc/nginx/sites-available/panel.runafinance.online
sudo nginx -t && sudo systemctl reload nginx
```

Проверка: открой **https://panel.runafinance.online** — должно быть без предупреждения, с замком в адресной строке.

---

## 5. Продление

Один сертификат для api и один для panel — при следующем `certbot renew` продлятся оба (если оба выданы через certbot на этом сервере). Таймер уже настроен — ничего дополнительно делать не нужно.

---

## Если что-то не так

- **Всё ещё «Не защищено»** — убедись, что открываешь именно **https://**panel.runafinance.online (не http).
- **404** — проверь, что в `/var/www/panel-runa` лежат файлы из `dist/` (есть `index.html` и папка `assets/`).
- **Сертификат не подходит** — в конфиге должны быть пути именно к `panel.runafinance.online`:  
  `fullchain.pem` и `privkey.pem` из `/etc/letsencrypt/live/panel.runafinance.online/`.
