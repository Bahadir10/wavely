# 🎭 Maestro E2E Test Kılavuzu

Bu doküman, **Wavely** projesinde uçtan uca (End-to-End / UI) kullanıcı akışlarını otomatik olarak test etmek için kurulan **Maestro** altyapısını ve kullanımını açıklar.

---

## 🚀 1. Maestro Kurulumu (Tek Komut)

### Windows (PowerShell):
```powershell
powershell -c "irm https://get.maestro.mobile.dev | iex"
```

### macOS / Linux:
```bash
brew tap mobile-dev-inc/tap
brew install maestro
```

Kurulumu doğrulamak için:
```bash
maestro --version
```

---

## 📱 2. Testleri Çalıştırma

Testleri çalıştırmadan önce bilgisayarınıza bir **Android Emulator** açın veya **USB / Wi-Fi ile gerçek bir Android telefon bağlayın** (`adb devices` komutunda cihazınız görünmelidir).

### Tüm E2E Akışlarını Koşmak:
```bash
npm run test:e2e
# veya doğrudan:
maestro test .maestro/
```

### Belirli Bir Testi Koşmak:
```bash
# Sadece radyo çalma ve sonraki/önceki radyo geçiş testi:
maestro test .maestro/01_play_and_skip_radio.yaml

# Sadece arama ve favoriye ekleme testi:
maestro test .maestro/02_search_and_favorite.yaml
```

---

## 🎨 3. Maestro Studio (İnteraktif Görsel Editör)

Maestro'nun en güçlü özelliklerinden biri olan görsel arayüzü başlatmak için:
```bash
maestro studio
```
Tarayıcınızda açılan ekranda telefon ekranını canlı görürsünüz. Herhangi bir butona tıkladığınızda Maestro size o butonun test kodunu otomatik üretir!

---

## 📂 4. Projemizdeki Test Senaryoları

| Dosya | Açıklama |
| :--- | :--- |
| [`.maestro/01_play_and_skip_radio.yaml`](file:///c:/Users/Bahadir/Desktop/software/radio-app/.maestro/01_play_and_skip_radio.yaml) | Uygulamayı açar → İstasyon seçer → Mini player'a basar → Full Player'da **Sonraki Radyo**, **Önceki Radyo** ve **Play/Pause** butonlarına basarak modalı kapatır. |
| [`.maestro/02_search_and_favorite.yaml`](file:///c:/Users/Bahadir/Desktop/software/radio-app/.maestro/02_search_and_favorite.yaml) | Arama sekmesine geçer → "Power" yazar → Çıkan istasyonu favoriler → Favoriler sekmesinde listelendiğini doğrular. |

---

## 🛡️ 5. testID Mimarisi
Testlerin dil çevirilerinden (Türkçe / İngilizce) etkilenmemesi için bileşenlerimize özel `testID` etiketleri eklenmiştir:
* `tab-index`, `tab-search`, `tab-favorites`, `tab-settings`
* `mini-player`, `mini-player-toggle`
* `btn-play-pause`, `btn-play-next`, `btn-play-previous`, `btn-favorite`, `btn-close-player`
* `search-input`, `station-row`, `station-favorite-btn`
