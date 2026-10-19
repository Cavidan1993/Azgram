# AzGram 0 AZN Production Deployment Guide

Bu təlimat **AzGram** sosial şəbəkəsini heç bir ödəniş etmədən (**dəqiq 0 AZN büdcə**) tam production səviyyəsində qurmaq və işə salmaq üçün addım-addım bələdçidir.

---

## 1. Büdcə və Resurs Analizi (0 AZN Zəmanəti)

| Xidmət | Pulsuz Tarif (Free Tier) | AzGram üçün İstifadəsi | Xərc |
| :--- | :--- | :--- | :--- |
| **Supabase** | PostgreSQL 500 MB, Storage 1 GB, 50,000 MAU Auth, 2 aktiv layihə | Əsas verilənlər bazası, RLS, Auth, Şəkillər və Realtime | **0 AZN** |
| **Cloudflare Pages** | Limitsiz trafik, 500 build/ay, Pulsuz SSL & Custom Domain | React + Vite veb-tətbiqinin qlobal CDN hostinqi | **0 AZN** |
| **GitHub** | Limitsiz ictimai/özəl repozitoriyalar, GitHub Actions | Kod bazası, versiyalar və SQL miqrasiyalar | **0 AZN** |
| **Android APK** | Android Studio / AI Studio yerli daxili qurulması | Android smartfonları üçün yerli tətbiq paketi | **0 AZN** |

> **Qeyd:** Heç bir yerdə kredit kartı məlumatı və ya ödənişli plan tələb olunmur. Firebase Blaze və ya ödənişli API-lər istifadə edilmir.

---

## 2. Supabase Verilənlər Bazasının Qurulması

1. [supabase.com](https://supabase.com) saytına daxil olun və pulsuz hesab yaradın.
2. **New Project** düyməsini sıxın:
   - **Name:** `azgram-prod`
   - **Database Password:** Güclü şifrə seçin və yadda saxlayın.
   - **Region:** `Frankfurt (eu-central-1)` (Azərbaycana ən yaxın və sürətli pulsuz server).
   - **Pricing Plan:** `Free ($0/month)`.
3. Sol menyudan **SQL Editor** bölməsinə keçin və növbə ilə `supabase/migrations/` qovluğundakı 4 miqrasiya faylını işə salın:
   - `20261018000001_initial_schema.sql` (Cədvəllər, açarlar, indekslər)
   - `20261018000002_rls_and_policies.sql` (Row Level Security siyasətləri)
   - `20261018000003_triggers_and_notifications.sql` (Avtomatik sayğaclar və bildirişlər)
   - `20261018000004_storage_and_ratelimits.sql` (Storage bucket-ləri və fayl təhlükəsizliyi)
4. Sol menyudan **Project Settings -> API** bölməsinə keçin və bu dəyərləri kopyalayın:
   - **Project URL:** `https://xyzcompany.supabase.co`
   - **Project API Keys -> anon / public:** `eyJhbGci...`

### İlk Admin İstifadəçisinin Təyini
İstifadəçi qeydiyyatdan keçdikdən sonra onu admin etmək üçün Supabase SQL Editor-da bu əmri icra edin:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@azgram.az'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

## 3. Cloudflare Pages ilə Veb Fikrinin Hostinqi (React + Vite)

1. [dash.cloudflare.com](https://dash.cloudflare.com) ünvanına daxil olun.
2. **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git** seçin.
3. AzGram repozitoriyanızı seçin.
4. Qurulma parametrlərini (Build settings) aşağıdakı kimi təyin edin:
   - **Framework preset:** `Vite`
   - **Root directory:** `web`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. **Environment variables (Ətraf mühit dəyişənləri):**
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
6. **Save and Deploy** düyməsini sıxın. 1 dəqiqə ərzində saytınız `https://azgram.pages.dev` ünvanında qlobal olaraq aktivləşəcək!
7. `web/public/_routes.json` faylı avtomatik olaraq SPA (Single Page Application) yönləndirməsini təmin edir, beləliklə səhifəni yenilədikdə 404 xətası yaranmır.

---

## 4. Android Tətbiqinin İcra Edilməsi və APK İxracı

1. Android tətbiqini yerli mühitdə işə salmaq və yoxlamaq üçün:
   ```bash
   gradle assembleDebug
   ```
2. Generasiya olunmuş APK faylı burada yerləşir:
   `app/build/outputs/apk/debug/app-debug.apk`
3. Tətbiq daxilində yuxarı sağdakı **Parametrlər (Şapka/Dişli)** düyməsinə klikləyərək istənilən vaxt real Supabase URL və Anon Key daxil edə, **"Əlaqəni Test Et"** düyməsi ilə bağlantını təsdiqləyə bilərsiniz.

---

## 5. Məlumatların Qorunması və Yenidən Yerləşdirmə (Redeploy) Zəmanəti

- Bütün məlumatlar (şəkillər istisna olmaqla bütün yazılar, profillər, izləyicilər, şərhlər) **PostgreSQL** bazasında saxlanılır.
- Şəkillər **Supabase Storage**-də saxlanılır.
- İstifadəçi sessiyası brauzerdə və ya Android-də keşlənsə belə, çıxış edib yenidən daxil olduqda və ya veb-sayt yenidən deploy (redeploy) edildikdə heç bir məlumat itmir.
- SQL miqrasiyaları versiyalaşdırılıb (`supabase/migrations/`), ona görə təkrar deploy zamanı `DROP TABLE` əmrləri istifadə edilmir və məlumat bazası toxunulmaz qalır.
