# Anketci

Kahoot benzeri, real-time canli anket/quiz uygulamasi. Etkinliklerde, siniflarda veya toplantilarda projeksiyondan soru gosterip, katilimcilarin telefonlarindan anlik oy kullanmasini saglayan web tabanli bir sistem.

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
- **Kolay kurulum** - Tek komutla calisir, veritabani gerektirmez
- **Dis erisim** - localtunnel/ngrok ile farkli aglardan erisim

## Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                        Node.js Server                        │
│                   Express + Socket.IO                         │
├──────────┬──────────────────┬────────────────────────────────┤
│ REST API │   WebSocket Hub  │       Static Files             │
│ (CRUD)   │   (real-time)    │  (HTML/CSS/JS)                 │
└──────────┴──────────────────┴────────────────────────────────┘
      │              │                      │
      ▼              ▼                      ▼
┌──────────┐  ┌─────────────┐  ┌────────────────────────────┐
│  Admin   │  │  Display    │  │       Player (Mobil)       │
│  Panel   │  │ Projeksiyon │  │  QR → Rumuz → Oylama       │
└──────────┘  └─────────────┘  └────────────────────────────┘
```

**3 arayuz, tek sunucu:**

| Sayfa | Adres | Amac |
|---|---|---|
| Admin Panel | `/admin.html` | Soru olusturma, oturum yonetimi, akis kontrolu |
| Projeksiyon | `/display.html` | QR kod, canli sorular, animasyonlu sonuclar |
| Oyuncu | `/player.html` | Mobil katilim, oylama |

## Teknolojiler

| Teknoloji | Kullanim |
|---|---|
| **Node.js** | Sunucu ortami |
| **Express** | HTTP sunucu ve REST API |
| **Socket.IO** | Real-time cift yonlu iletisim |
| **qrcode** | QR kod olusturma |
| **localtunnel** | Otomatik tunnel (dis ag erisimi) |

## Kurulum

### Gereksinimler

- [Node.js](https://nodejs.org/) v18 veya ustu

### Adimlar

```bash
# Repoyu klonlayin
git clone https://github.com/haliskilic/anketci.git
cd anketci

# Bagimliliklari yukleyin
npm install

# Sunucuyu baslatin
npm start
```

Sunucu basladiginda su ciktiyi goreceksiniz:

```
🚀 Anketci calisiyor: http://localhost:3000
   Admin Panel:      http://localhost:3000/admin.html
   Projeksiyon:      http://localhost:3000/display.html
   Oyuncu (mobil):   http://localhost:3000/player.html
```

### Port Degistirme

```bash
PORT=8080 npm start
```

## Kullanim

### 1. Soru Hazirlama

`http://localhost:3000/admin.html` adresine gidin:

- Soru metnini girin
- En az 2, en fazla 6 secenek ekleyin
- Sure belirleyin (varsayilan: 30 saniye)
- **Soruyu Kaydet** butonuna basin
- Istediginiz kadar soru ekleyin, duzenleyin veya silin

### 2. Oturumu Baslatma

- Admin panelinde **Oturumu Baslat** butonuna basin
- Projeksiyon ekranini (`/display.html`) projeksiyondan yansitın
- Ekranda QR kod ve katilim linki gorunecek

### 3. Katilimci Girisi

- Katilimcilar QR kodu telefonlariyla taratir
- Acilan sayfada bir rumuz girerek katilir
- Lobide beklerken projeksiyon ekraninda katilimci sayisi ve isimleri gorulur

### 4. Anket Akisi

- Admin panelinden **Sonraki Soru** butonuna basin
- Soru hem projeksiyonda hem tum telefonlarda es zamanli gorunur
- Katilimcilar seceneklerden birine dokunarak oy kullanir
- Geri sayim bittiginde sonuclar yuzdelik grafiklerle goruntulenir
- **Sonraki Soru** ile devam edin
- Tum sorular bittiginde "Anket Tamamlandi" ekrani gorunur

## Farkli Agdan Erisim

Katilimcilar sunucu ile ayni WiFi aginda degilse:

### Secenek 1: localtunnel (otomatik)

Sunucu basladiginda otomatik olarak tunnel acmayi dener. Basarili olursa konsolda public URL gorursunuz.

### Secenek 2: ngrok

```bash
# ngrok kurun (https://ngrok.com)
ngrok http 3000
```

Verilen `https://xxxx.ngrok.io` adresini kullanin.

### Secenek 3: Ayni ag (en basit)

Bilgisayarin yerel IP'sini bulun:

```bash
hostname -I
```

Katilimcilar `http://<IP>:3000/player.html` adresinden erisir.

## Yuk Testi

Projeye dahil olan yuk testi ile 100 kullanici senaryosunu dogrulayabilirsiniz:

```bash
# Sunucu calisiyor olmali
node test-load.js
```

Test senaryosu:
- 100 es zamanli Socket.IO baglantisi
- Tum oyuncularin lobiye katilimi
- 100 es zamanli oy kullanimi
- Sonuc dogrulama (oy sayisi, yuzde hesaplari)
- Coklu soru gecisi
- Oturum yasam dongusu (lobby → question → results → finished)

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
| `register-admin` | Client → Server | Admin olarak kaydol |
| `register-display` | Client → Server | Projeksiyon olarak kaydol |
| `join` | Client → Server | Oyuncu katilimi (nickname) |
| `vote` | Client → Server | Oy kullan (option index) |
| `start-session` | Client → Server | Oturumu baslat |
| `next-question` | Client → Server | Sonraki soruya gec |
| `end-session` | Client → Server | Oturumu bitir |
| `state` | Server → Client | Durum guncelleme broadcast |
| `timer` | Server → Client | Geri sayim (saniye) |
| `vote-count` | Server → Client | Anlik oy sayisi |

## Lisans

MIT
