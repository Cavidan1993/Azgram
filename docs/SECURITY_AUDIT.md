# AzGram Təhlükəsizlik Auditi və RLS Qaydaları

## 1. Zero-Trust Memarlıq Prinsipləri
AzGram-da heç vaxt müştəri tərəfinə (front-end və ya mobil tətbiq) etibar edilmir. Bütün təhlükəsizlik qaydaları, məlumat yoxlamaları və icazələr bilavasitə **PostgreSQL** daxilində Row Level Security (RLS) və tranzaksiya triggerləri səviyyəsində tətbiq olunur.

## 2. Row Level Security (RLS) Matrisi

| Cədvəl | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Hər kəsə açıq (`true`) | Yalnız öz ID-si (`auth.uid() = id`) | Yalnız sahibi və ya Admin | Yalnız Admin |
| `user_roles` | İstifadəçi öz rolunu, Admin hamısını görür | Yalnız Admin | Yalnız Admin | Yalnız Admin |
| `posts` | `is_hidden = FALSE` və ya Admin və ya Müəllif | `auth.uid() = user_id` və qadağan olunmayıb | Yalnız müəllif və ya Admin (`is_hidden`) | Yalnız müəllif və ya Admin |
| `comments` | Hər kəsə açıq | `auth.uid() = user_id` və post gizli deyil | Yalnız müəllif | Müəllif, Post sahibi və ya Admin |
| `likes` | Hər kəsə açıq | `auth.uid() = user_id` | Qadağandır (`false`) | Yalnız öz laykını silə bilər |
| `follows` | Hər kəsə açıq | `auth.uid() = follower_id` və `follower_id <> following_id` | Qadağandır (`false`) | Yalnız öz izləməsini silə bilər |
| `notifications` | Yalnız alıcı (`auth.uid() = recipient_id`) | Sistem triggeri və ya `sender_id = auth.uid()` | Yalnız alıcı (`is_read`) | Yalnız alıcı |
| `reports` | Şikayətçi və ya Admin | Hər hansı daxil olmuş istifadəçi | Yalnız Admin | Yalnız Admin |
| `rate_limits` | İstifadəçi öz tarixçəsi və ya Admin | Yalnız sistem və ya istifadəçi | Qadağandır | Qadağandır |

## 3. Storage Təhlükəsizlik Siyasətləri
1. **`avatars` Bucket:**
   - Fayl ölçüsü məhdudiyyəti: **2 MB**.
   - İcazə verilən formatlar: `image/jpeg`, `image/png`, `image/webp`.
   - Yol strukturu: `{user_id}/{filename}` (İstifadəçi yalnız öz qovluğuna yaza bilər).
2. **`posts` Bucket:**
   - Fayl ölçüsü məhdudiyyəti: **5 MB**.
   - İcazə verilən formatlar: `image/jpeg`, `image/png`, `image/webp`.
   - Yol strukturu: `{user_id}/{filename}`.
   - Bloklanmış (`is_banned = TRUE`) istifadəçilərin şəkil yükləməsi RLS tərəfindən bloklanır.

## 4. Anti-Spam və Server-Side Rate Limiting
- `enforce_rate_limit(action, max_allowed, window_seconds)` funksiyası vasitəsilə:
  - 1 dəqiqədə maksimum 10 post yaradılmasına icazə verilir.
  - 1 dəqiqədə maksimum 30 şərh yazılmasına icazə verilir.
  - Limit aşıldıqda PostgreSQL `RAISE EXCEPTION` qaytarır və əməliyyat dayandırılır.

## 5. İcra Olunmuş Yoxlamalar
- [x] Müştəridən birbaşa SQL sorğusu göndərildikdə başqa istifadəçinin postunu dəyişmək və ya silmək mümkün deyil.
- [x] İnsanın özünə follow atması `CHECK (follower_id <> following_id)` ilə məhdudlaşdırılıb.
- [x] Eyni posta təkrar like atılması `UNIQUE (post_id, user_id)` ilə bloklanıb.
- [x] `service_role` açarı heç vaxt müştəri tərəfə ötürülmür, yalnız ictimai `anon` açarı istifadə olunur.
