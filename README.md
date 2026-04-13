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

## Kurulum (Windows)

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
