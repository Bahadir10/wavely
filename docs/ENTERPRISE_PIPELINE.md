# 🏢 Kurumsal Mobil Geliştirme & CI/CD Boru Hattı Rehberi

Bu doküman, **Wavely** ve modern React Native / Expo projelerinde kurumsal teknoloji şirketlerinin (Spotify, Trendyol, Getir vb.) kullandığı uçtan uca mobil geliştirme, test, dağıtım ve izleme standartlarını açıklar.

---

## 🧭 1. Mimari Genel Bakış (Workflow Pipeline)

```
[Fikir / Task] 
      ↓
[Feature Branch] → [Yerel Geliştirme & Web Preview]
      ↓
[Pull Request (PR)] → 🚨 [CI Gatekeeper: Lint + Typecheck + Jest Unit Tests]
      ↓
[Otomatik E2E Test] → 📱 [Maestro Flow UI Simülasyonu]
      ↓
[Preview Dağıtımı] → 📦 [EAS Preview APK / TestFlight Beta]
      ↓
[Code Review & Merge] → 🚀 [main Branch]
      ↓
[Canlıya Çıkış] → 🎯 [Kademeli Dağıtım (Staged Rollout: %5 → %20 → %100)]
      ↓
[Canlı İzleme] → 📊 [Sentry Crash Reporting + Analytics]
```

---

## 📌 2. Aşama Aşama Kurumsal Süreçler

### 1. Geliştirme & Dal (Branching) Stratejisi
* **Ana Dal Koruması (Protected `main` / `master`):**
  * Kimse doğrudan `main` dalına commit atamaz.
  * Değişiklikler her zaman `feature/lock-screen-controls` veya `fix/metadata-quotes` dallarında yapılır.
* **Pull Request (PR) Zorunluluğu:**
  * En az 1 kıdemli geliştirici onayı olmadan kod ana dala birleşemez.

---

### 2. Sürekli Entegrasyon (CI - Continuous Integration)
GitHub Actions üzerinde her PR açıldığında veya koda push yapıldığında 3 süzgeç çalışır:

1. **TypeScript Typecheck (`tsc --noEmit`):** Tip uyumsuzlukları ve eksik parametreler derlenmeden yakalanır.
2. **ESLint (`expo lint`):** Kodlama standartları (unescaped stringler, kullanılmayan importlar) temizlenir.
3. **Birim Testleri (`jest`):** Store mantığı, veri filtreleri, stream URL formatları ve kilit ekranı kuyrukları test edilir.

> **💡 Az Önce Yaşadığımız Durum:**
> CI'ın hata verip kırmızı yanması kurumsal süreçlerin **tam olarak amacına ulaştığını** gösterir! Bozuk veya standart dışı bir kodun kullanıcıya gitmesi engellendi. Geliştirici (veya Antigravity) hatayı düzeltip push'layınca CI anında yeşile döner.

---

### 3. E2E (End-to-End) UI Testleri: Maestro
Birim testleri kodun iç mantığını test eder; ancak **"Kullanıcı butona bastığında radyo çalıyor mu?"** sorusunun cevabını **Maestro** verir.

#### Maestro Nedir ve Neden Tercih Edilir?
* Appium veya Detox gibi hantal ve kurulumu zor araçların yerine çıkan modern standarttır.
* YAML formatında insan gibi okunan basit akışlar yazılır.

#### Örnek Maestro Akışı (`.maestro/play_radio_flow.yaml`):
```yaml
appId: com.bahadir.wavely
---
- launchApp
- assertVisible: "Wavely"
# Favorilerden bir radyoya tıkla
- tapOn: "Favori Radyolarınız"
# Oynatıcının açıldığını doğrula
- assertVisible: "CANLI YAYIN"
# Sonraki radyo butonuna bas
- tapOn:
    id: "Next station"
# Oynat/Duraklat butonunu test et
- tapOn:
    id: "Pause"
- assertVisible: "Play"
```
Bu testler GitHub Actions içinde sanal Android simülatöründe (veya Maestro Cloud üzerinde) PR açıldığında otomatik çalıştırılır.

---

### 4. Önizleme & Test Dağıtımı (Preview & Beta Builds)

Kurumsal şirketlerde geliştiriciler kablo ile telefon bağlamaz:
* **EAS Preview APK (Android):**
  * PR açıldığında veya ihtiyaç duyulduğunda bulutta APK derlenir.
  * QA (Test Mühendisleri) ve Ürün Yöneticisi doğrudan indirme linkinden veya QR koddan cihazına kurar.
* **Apple TestFlight (iOS):**
  * Şirket içi tester'lara bildirim düşer, tek tıkla güncelleme yüklenir.
* **EAS Update (OTA - Over The Air):**
  * Sadece React/JS kodları değiştiğinde yeni APK derlemeye gerek kalmadan 15 saniyede mevcut telefonlardaki uygulama güncellenir.

---

### 5. Canlıya Çıkış & Kademeli Dağıtım (Staged Rollout)

Uygulama onaylandığında bir anda tüm kullanıcılara açılmaz:
1. **1. Gün (%5 Dağıtım):** Uygulama yalnızca kullanıcıların %5'ine gönderilir.
2. **Çökme & Sağlık İzleme:** İlk 24 saat çökme oranı (Crash Rate) izlenir.
3. **3. Gün (%20 Dağıtım):** Hata yoksa kademe artırılır.
4. **5. Gün (%50 Dağıtım):**
5. **7. Gün (%100 Dağıtım):** Tüm dünyadaki kullanıcılara açılır.

---

### 6. Canlı İzleme & Hata Yakalama (Observability)

Kullanıcıların telefonunda bir sorun çıktığında bunu şirkete haber veren sistemler:
* **Sentry (Crash Reporting):**
  * Bir radyo stream'i çökerse veya ses servisi durursa:
  * Hatanın hangi marka telefonda (örn. Xiaomi Redmi Note 12), hangi Android sürümünde ve hangi satırda yaşandığı anında bildirim olarak Slack / Discord kanalına düşer.
* **PostHog / Mixpanel (Kullanıcı Analitiği):**
  * Kullanıcılar en çok hangi radyoları dinliyor?
  * Kilit ekranı kontrollerini ne sıklıkla kullanıyorlar?

---

## 🤖 7. Yapay Zeka (AI / Agent) Otonom Döngüsü

Antigravity gibi otonom ajanlarla çalışırken bu boru hattı şöyle otomatize edilebilir:
1. **CI Kırmızı Yandığında:** GitHub Webhook veya siz ekran görüntüsü / log attığınızda ajan hatayı doğrudan kod tabanında tespit eder.
2. **Otomatik Düzeltme:** Kodu düzeltir, testleri yerelde çalıştırır.
3. **Pull Request & Merge:** Düzeltmeyi GitHub'a push'lar, CI yeşile döner.
