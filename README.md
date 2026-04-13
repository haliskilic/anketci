# Anketci

Kahoot benzeri, real-time canli anket/quiz uygulamasi. Etkinliklerde, siniflarda veya toplantilarda projeksiyondan soru gosterip, katilimcilarin telefonlarindan anlik oy kullanmasini saglayan web tabanli bir sistem.

Katilimcilar sunucuyla ayni agda olmak zorunda degildir. Uygulama internet uzerinden tunnel araciligi ile calisir; port acma, firewall ayari veya ag yapilandirmasi gerektirmez.

## Ne Ise Yarar?

Bir sunucu/egitimci olarak:

1. Admin panelinden sorularinizi ve seceneklerinizi hazirliyorsunuz
2. Oturumu baslattiginizda projeksiyon ekraninda QR kod beliriyor
3. Katilimcilar (200 kisiye kadar) QR kodu taratip rumuz girerek katiliyor
4. Her soru hem projeksiyonda hem katilimcilarin telefonunda es zamanli gorunuyor
5. Belirlenen sure dolunca sonuclar yuzdesel olarak ekrana yansiyor
6. Sonraki soruya gectiginizde herkes senkron olarak yeni soruyu goruyor

## Ozellikler

- **Real-time senkronizasyon** - Socket.IO ile anlik iletisim, sifir gecikme
- **QR ile kolay katilim** - Uygulama indirme yok, tarayicidan katilim
- **200 kisiye kadar destek** - 100 kisilik yuk testiyle dogrulanmis
- **Mobil uyumlu** - Oyuncu arayuzu telefon ekranina optimize
- **Soru zamanlayici** - Her soru icin ayarlanabilir sure (5-120 saniye)
- **Canli sonuclar** - Animasyonlu yuzdelik sonuc grafikleri
- **Port acma gerektirmez** - Tunnel ile otomatik dis erisim
- **Kolay kurulum** - Tek komutla calisir, veritabani gerektirmez

## Mimari

```
                         internet
                            |
                      ┌───────────┐
                      │  Tunnel   │  (localtunnel / ngrok)
                      │  Public   │  Port acma gerektirmez
                      │  URL      │
                      └─────┬─────┘
                            |
┌───────────────────────────┼──────────────────────────────────┐
│                     Node.js Server                            │
│                  Express + Socket.IO                          │
├──────────┬─────────────────┬─────────────────────────────────┤
│ REST API │  WebSocket Hub  │       Static Files              │
│ (CRUD)   │  (real-time)    │  (HTML/CSS/JS)                  │
└──────────┴─────────────────┴─────────────────────────────────┘
      │              │                      │
      ▼              ▼                      ▼
┌──────────┐  ┌─────────────┐  ┌────────────────────────────┐
│  Admin   │  │  Display    │  │    Player (Mobil Telefon)  │
│  Panel   │  │ Projeksiyon │  │    Farkli ag, internet     │
│ localhost│  │ localhost   │  │    uzerinden tunnel ile    │
└──────────┘  └─────────────┘  └────────────────────────────┘
```

**3 arayuz, tek sunucu:**

| Sayfa | Adres | Amac |
|---|---|---|
| Admin Panel | `/admin.html` | Soru olusturma, oturum yonetimi, akis kontrolu |
| Projeksiyon | `/display.html` | QR kod, canli sorular, animasyonlu sonuclar |
| Oyuncu | `/player.html` | Mobil katilim, oylama (tunnel uzerinden erisir) |

## Teknolojiler

| Teknoloji | Kullanim |
|---|---|
| **Node.js** | Sunucu ortami |
| **Express** | HTTP sunucu ve REST API |
| **Socket.IO** | Real-time cift yonlu iletisim |
| **qrcode** | QR kod olusturma |
| **localtunnel** | Otomatik tunnel (port acmadan dis erisim) |

## Kurulum (Ubuntu - Sunucu / Internet Uzerinden Hizmet)

Bu bolum, Anketci'yi bir Ubuntu sunucusunda (VPS, bulut sunucu vb.) kurup internetten hizmet verecek sekilde yapilandirmayi anlatir. Tunnel yerine dogrudan domain ve SSL ile calisir.

### Gereksinimler

- Ubuntu 20.04 / 22.04 / 24.04 (veya turevleri)
- Root veya sudo yetkili kullanici
- Bir domain adi (ornegin `anketci.orneksite.com`) — sunucunuzun IP adresine yonlendirilmis olmali
- Acik portlar: 80 (HTTP) ve 443 (HTTPS)

### 1. Sistem Guncellemesi ve Temel Paketler

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### 2. Node.js Kurulumu

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Dogrulayin:

```bash
node --version
npm --version
```

### 3. Projeyi Indirme ve Kurma

```bash
cd /opt
sudo git clone https://github.com/haliskilic/anketci.git
sudo chown -R $USER:$USER /opt/anketci
cd /opt/anketci
npm install --production
```

### 4. Ortam Degiskenleri

Tunnel kullanmak yerine kendi domain'inizi `TUNNEL_URL` olarak ayarlayin. Boylece QR kodlar ve katilim linkleri dogrudan sizin adresinizi gosterecektir:

```bash
export PORT=3000
export TUNNEL_URL=https://anketci.orneksite.com
```

### 5. systemd ile Servis Olarak Calistirma

Sunucu yeniden baslatildiginda Anketci otomatik baslasin:

```bash
sudo tee /etc/systemd/system/anketci.service > /dev/null <<'EOF'
[Unit]
Description=Anketci - Canli Anket Uygulamasi
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/anketci
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=PORT=3000
Environment=TUNNEL_URL=https://anketci.orneksite.com
# Node.js uygulama ortami
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
```

> **Onemli:** `TUNNEL_URL` degerini kendi domain adresinizle degistirin.

Dosya izinlerini ayarlayin ve servisi baslatin:

```bash
sudo chown -R www-data:www-data /opt/anketci
sudo systemctl daemon-reload
sudo systemctl enable anketci
sudo systemctl start anketci
```

Durumu kontrol edin:

```bash
sudo systemctl status anketci
```

Loglari izlemek icin:

```bash
sudo journalctl -u anketci -f
```

### 6. Nginx Reverse Proxy Kurulumu

Nginx, disaridan gelen HTTP/HTTPS isteklerini Node.js uygulamasina yonlendirir ve WebSocket (Socket.IO) baglantisini destekler:

```bash
sudo apt install -y nginx
```

Site yapilandirmasi olusturun:

```bash
sudo tee /etc/nginx/sites-available/anketci > /dev/null <<'EOF'
server {
    listen 80;
    server_name anketci.orneksite.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket destegi (Socket.IO icin gerekli)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket zaman asimi
        proxy_read_timeout 86400;
    }
}
EOF
```

> **Onemli:** `server_name` degerini kendi domain adresinizle degistirin.

Siteyi etkinlestirin ve Nginx'i yeniden baslatin:

```bash
sudo ln -s /etc/nginx/sites-available/anketci /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Sertifikasi (Let's Encrypt - Ucretsiz HTTPS)

Katilimcilar internet uzerinden baglanacagi icin HTTPS zorunludur. Let's Encrypt ile ucretsiz SSL sertifikasi alin:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d anketci.orneksite.com
```

Certbot sizden e-posta adresi isteyecek ve kullanim kosullarini kabul etmenizi bekleyecek. Islem tamamlandiginda Nginx yapilandirmasi otomatik olarak HTTPS'e guncellenir.

Sertifika otomatik yenilemeyi test edin:

```bash
sudo certbot renew --dry-run
```

### 8. Guvenlik Duvari (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 9. Dogrulama

Kurulum tamamlandiginda:

1. Tarayicidan `https://anketci.orneksite.com/admin.html` adresine gidin — Admin paneli acilmali
2. `https://anketci.orneksite.com/display.html` — Projeksiyon ekrani
3. Oturumu baslattiginizda QR kod `https://anketci.orneksite.com/player.html` adresini gosterecek
4. Katilimcilar internet uzerinden dogrudan bu adrese erisebilir — tunnel gerekmez

### Faydali Komutlar

```bash
# Servisi yeniden baslat
sudo systemctl restart anketci

# Servisi durdur
sudo systemctl stop anketci

# Loglari goruntule
sudo journalctl -u anketci -n 50

# Nginx yapilandirmasini test et
sudo nginx -t

# SSL sertifika durumunu kontrol et
sudo certbot certificates
```

---

## Kurulum (Windows - Yerel Kullanim / Tunnel ile)

Bu bolum, Windows uzerinde yerel olarak calistirip tunnel ile dis erisim saglamayi anlatir.

### 1. Node.js Kurulumu

1. [https://nodejs.org](https://nodejs.org) adresine gidin
2. **LTS** surumunu indirin (ornegin `22.x.x LTS`)
3. Indirilen `.msi` dosyasini calistirim, tum adimlarda **Next** deyin
4. Kurulum tamamlaninca **Komut Istemi** (Command Prompt) veya **PowerShell** acin
5. Dogrulayin:

```cmd
node --version
npm --version
```

Iki komut da sifir hatasiz surum numarasi gosteriyorsa kurulum tamamdir.

### 2. Projeyi Indirme ve Kurma

**Komut Istemi** veya **PowerShell** acin ve sirasina su komutlari calistirin:

```cmd
git clone https://github.com/haliskilic/anketci.git
cd anketci
npm install
```

> Git kurulu degilse: [https://git-scm.com/download/win](https://git-scm.com/download/win) adresinden indirip kurun.
> Alternatif olarak GitHub'dan ZIP indirebilirsiniz: Code > Download ZIP, cikarip klasore girin.

### 3. Sunucuyu Baslatma

```cmd
npm start
```

Konsolda su ciktiyi goreceksiniz:

```
🚀 Anketci calisiyor: http://localhost:3000
   Admin Panel:      http://localhost:3000/admin.html
   Projeksiyon:      http://localhost:3000/display.html

🔗 Tunnel aciliyor...
✅ Tunnel hazir: https://xxxxx.loca.lt
   Oyuncular bu linkle katilacak: https://xxxxx.loca.lt/player.html
   QR kod bu adresi gosterecek.
```

> **Windows Guvenlik Duvari uyarisi cikarsa:** "Erisime izin ver" secenegini tiklayin. Bu sadece tunnel baglantisinun calismasi icindir, port acmaz.

### localtunnel Baglanamazsa: ngrok Kullanimi

Eger localtunnel baglanti kuramazsa, ngrok ile manuel tunnel acabilirsiniz:

1. [https://ngrok.com/download](https://ngrok.com/download) adresinden Windows surumunu indirin
2. Zip'i cikarip `ngrok.exe` dosyasini bir klasore koyun
3. [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) adresinden ucretsiz hesap olusturun
4. Authtoken'inizi kopyalayin ve calistirin:

```cmd
ngrok config add-authtoken TOKENINIZ
```

5. Anketci sunucusu calisirken **ayri bir terminal** acip calistirin:

```cmd
ngrok http 3000
```

6. Konsolda gordugunuz `https://xxxx-xx-xx.ngrok-free.app` adresini kopyalayin
7. Anketci sunucusunu durdurup (Ctrl+C) bu URL ile yeniden baslatin:

```cmd
set TUNNEL_URL=https://xxxx-xx-xx.ngrok-free.app
npm start
```

Artik QR kod bu adresi gosterecektir.

### Port Degistirme (Opsiyonel)

```cmd
set PORT=8080
npm start
```

## Kullanim

### 1. Soru Hazirlama

Tarayicinizda `http://localhost:3000/admin.html` adresine gidin:

- Soru metnini girin
- En az 2, en fazla 6 secenek ekleyin
- Sure belirleyin (varsayilan: 30 saniye)
- **Soruyu Kaydet** butonuna basin
- Istediginiz kadar soru ekleyin, duzenleyin veya silin

### 2. Oturumu Baslatma

- Admin panelinde **Oturumu Baslat** butonuna basin
- Projeksiyon ekranini (`http://localhost:3000/display.html`) projeksiyondan yansitin
- Ekranda QR kod ve tunnel adresi gorunecek

### 3. Katilimci Girisi

- Katilimcilar kendi telefonlarindan QR kodu taratir (internet erisimi yeterli, ayni agda olmak gerekmez)
- Acilan sayfada bir rumuz girerek katilir
- Lobide beklerken projeksiyon ekraninda katilimci sayisi ve isimleri gorulur

### 4. Anket Akisi

- Admin panelinden **Sonraki Soru** butonuna basin
- Soru hem projeksiyonda hem tum telefonlarda es zamanli gorunur
- Katilimcilar seceneklerden birine dokunarak oy kullanir
- Geri sayim bittiginde sonuclar yuzdelik grafiklerle goruntulenir
- **Sonraki Soru** ile devam edin
- Tum sorular bittiginde "Anket Tamamlandi" ekrani gorunur

## Yuk Testi

Projeye dahil olan yuk testi ile 100 kullanici senaryosunu dogrulayabilirsiniz:

```cmd
node test-load.js
```

Test senaryosu:
- 100 es zamanli Socket.IO baglantisi
- Tum oyuncularin lobiye katilimi
- 100 es zamanli oy kullanimi
- Sonuc dogrulama (oy sayisi, yuzde hesaplari)
- Coklu soru gecisi
- Oturum yasam dongusu (lobby -> question -> results -> finished)

## API Referansi

### REST Endpoints

| Metot | Endpoint | Aciklama |
|---|---|---|
| `GET` | `/api/questions` | Tum sorulari listele |
| `POST` | `/api/questions` | Yeni soru ekle |
| `PUT` | `/api/questions/:id` | Soruyu guncelle |
| `DELETE` | `/api/questions/:id` | Soruyu sil |
| `GET` | `/api/qr` | QR kod ve katilim URL'i al |

### Soru Formati (POST/PUT)

```json
{
  "text": "Soru metni",
  "options": ["Secenek 1", "Secenek 2", "Secenek 3"],
  "duration": 30
}
```

### Socket.IO Olaylari

| Olay | Yon | Aciklama |
|---|---|---|
| `register-admin` | Client -> Server | Admin olarak kaydol |
| `register-display` | Client -> Server | Projeksiyon olarak kaydol |
| `join` | Client -> Server | Oyuncu katilimi (nickname) |
| `vote` | Client -> Server | Oy kullan (option index) |
| `start-session` | Client -> Server | Oturumu baslat |
| `next-question` | Client -> Server | Sonraki soruya gec |
| `end-session` | Client -> Server | Oturumu bitir |
| `state` | Server -> Client | Durum guncelleme broadcast |
| `timer` | Server -> Client | Geri sayim (saniye) |
| `vote-count` | Server -> Client | Anlik oy sayisi |

## Lisans

MIT
