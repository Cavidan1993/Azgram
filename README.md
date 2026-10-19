# AzGram — Production-Oriented Social Network (0 AZN Budget)

AzGram — büdcəsi **dəqiq 0 AZN** olan, production səviyyəli sosial şəbəkə MVP-sidir.
Layihə həm **React + TypeScript + Vite (Cloudflare Pages)** veb-tətbiqini, həm də **Kotlin + Jetpack Compose** yerli Android tətbiqini ehtiva edir. Bütün verilənlər **Supabase Free Tier (PostgreSQL 15+, Auth, Storage, Realtime)** üzərində sıfır xərclə idarə olunur.

---

## 🛠️ Texnoloji Yığın (0 AZN Zəmanəti)
- **Verilənlər Bazası:** PostgreSQL 15+ (Supabase Free, 500 MB limit, RLS aktivdir).
- **Avtorizasiya:** Supabase Auth (E-poçt & Şifrə, 50,000 aylıq aktiv istifadəçi).
- **Fayl Saxlanc:** Supabase Storage (1 GB pulsuz saxlanc, `avatars` və `posts` bucket-ləri).
- **Veb Front-end:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Veb Hostinq:** Cloudflare Pages (Limitsiz trafik, qlobal CDN, pulsuz SSL).
- **Android Tətbiqi:** Kotlin 2.2, Jetpack Compose (Material Design 3), Room Database (offline keş), OkHttp.
- **Versiya Nəzarəti və Miqrasiyalar:** GitHub & SQL Miqrasiyaları (`supabase/migrations/`).

---

## 🚀 Əsas Funksionallıq
1. **Qeydiyyat & Giriş:** E-poçt/şifrə, təsdiq e-poçtu, şifrə bərpası, təhlükəsiz çıxış.
2. **Profil:** Avatar yüklənməsi, istifadəçi adı, göstərilən ad, bio, qeydiyyat tarixi, izləyici sayları.
3. **Paylaşımlar:** Şəkil yüklənməsi, təsvir mətni, müəllif və tarix.
4. **Əsas Lenta:** Cursor-based pagination (OFFSET deyil, yüksək sürətli O(1) indekslənmiş keçid).
5. **Bəyənmələr & Şərhlər:** PostgreSQL tranzaksiya triggerləri ilə avtomatik artan sayğaclar, dublikat layk qadağası.
6. **İzləmələr (Follows):** İstifadəçilərin bir-birini izləməsi, öz-özünü izləməyin (`CHECK`) və dublikatın qadağan edilməsi.
7. **Axtarış:** İstifadəçilər və paylaşımlar üzrə sürətli axtarış (Debounce və ILIKE).
8. **Real-time Bildirişlər:** Bəyənmələr, şərhlər və yeni izləyicilər üçün daimi bildirişlər və canlı yenilənmə.
9. **Admin Paneli:** Şikayətlər (reports), postların gizlədilməsi (spam təmizliyi) və istifadəçilərin bloklanması.
10. **Mobil Uyğunluq:** Həm mobil brauzerlər (iPhone / Android), həm də yerli Android Jetpack Compose tətbiqi.

---

## 📁 Layihə Strukturu
```text
/
├── supabase/
│   ├── migrations/
│   │   ├── 20261018000001_initial_schema.sql
│   │   ├── 20261018000002_rls_and_policies.sql
│   │   ├── 20261018000003_triggers_and_notifications.sql
│   │   └── 20261018000004_storage_and_ratelimits.sql
│   └── seed.sql
├── web/
│   ├── public/
│   │   ├── _routes.json
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── app/
│   └── src/main/java/com/example/
│       ├── data/
│       ├── ui/
│       └── MainActivity.kt
├── docs/
│   ├── DEPLOYMENT.md
│   ├── ERD.md
│   ├── SECURITY_AUDIT.md
│   └── TESTING_CHECKLIST.md
└── .env.example
```

---

## ⚡ Tez Başlanğıc Təlimatı

### Veb Layihəni İşə Salmaq (React + Vite)
```bash
cd web
npm install
npm run dev
```

### Cloudflare Pages üçün Yığmaq (Build)
```bash
cd web
npm run build
```

### Android Tətbiqini Qurmaq
```bash
gradle assembleDebug
```

Ətraflı qurulma və hostinq addımları üçün `docs/DEPLOYMENT.md` sənədini oxuyun.
Təhlükəsizlik qaydaları üçün `docs/SECURITY_AUDIT.md`, test ssenariləri üçün isə `docs/TESTING_CHECKLIST.md` sənədinə baxın.
