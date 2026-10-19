# AzGram Manual & Automated Testing Checklist

## 1. Funksional Testlər Çek-listi

### Mərhələ 1: Qeydiyyat və Giriş (Auth)
- [ ] Yeni e-poçt və şifrə ilə qeydiyyatdan keçmə.
- [ ] 3 simvoldan qısa istifadəçi adının qəbul edilməməsi.
- [ ] Düzgün e-poçt və şifrə ilə uğurlu giriş.
- [ ] Səhv şifrə daxil edildikdə müvafiq xəta mesajının göstərilməsi.
- [ ] Şifrənin bərpası üçün link tələb edilməsi.
- [ ] Sistemdən çıxış (Logout) və sessiyanın təmizlənməsi.

### Mərhələ 2: Profil İdarəetməsi
- [ ] İstifadəçi avatarının (JPEG/PNG/WebP, <2MB) yüklənməsi.
- [ ] İstifadəçi adının, göstərilən adının və Bio mətninin yenilənməsi.
- [ ] Qeydiyyat tarixinin və izləyici sayğaclarının düzgün göstərilməsi.
- [ ] İstifadəçinin öz şəkillərindən ibarət qrafik şəbəkənin (grid) yüklənməsi.

### Mərhələ 3: Paylaşımlar və Şəkillər
- [ ] Şəkil seçilməsi və təsvir (caption) yazılması.
- [ ] 5 MB-dan böyük faylların yüklənməsinin rədd edilməsi.
- [ ] Şəklin Supabase Storage `posts` bucket-inə uğurla yüklənməsi.
- [ ] Paylaşımın lentdə dərhal əks olunması.

### Mərhələ 4: Əsas Lenta və Cursor Pagination
- [ ] Lentanın ən son paylaşımlara görə sıralanması (`created_at DESC, id DESC`).
- [ ] Aşağı sürüşdürdükdə sonrakı səhifənin cursor-based yüklənməsi (OFFSET deyil).
- [ ] Boş və ya xəta hallarında müvafiq məlumat lövhəsinin göstərilməsi.
- [ ] Yeniləmə (Pull-to-refresh) zamanı ən son postların çəkilməsi.

### Mərhələ 5: Bəyənmələr (Likes) və Şərhlər (Comments)
- [ ] Ürək işarəsinə kliklədikdə layk sayının dərhal artması (Optimistic UI).
- [ ] Təkrar kliklədikdə laykın geri götürülməsi və sayğacın azalması.
- [ ] Eyni posta eyni istifadəçi tərəfindən dublikat laykın qarşısının alınması.
- [ ] Şərh yazılması və şərhlər siyahısında anında göstərilməsi.
- [ ] Şərh sayğacının verilənlər bazası triggeri ilə avtomatik artması.

### Mərhələ 6: İzləmələr (Follows)
- [ ] Başqa istifadəçini izləmə (Follow) və izləmədən çıxma (Unfollow).
- [ ] Öz-özünü izləməyə cəhd edildikdə bazanın `CHECK` məhdudiyyətinin işləməsi.
- [ ] İzləyici sayğacının düzgün sinxronlaşması.

### Mərhələ 7: Axtarış (Search)
- [ ] İstifadəçi adına görə axtarış və nəticələrin siyahılanması.
- [ ] Paylaşım təsvirinə görə axtarış və şəkillərin tapılması.
- [ ] Debounce ilə verilənlər bazasının artıq yüklənmədən qorunması.

### Mərhələ 8: Real-time Bildirişlər
- [ ] Kiminsə postunu bəyəndikdə müəllifə daimi `like` bildirişinin yazılması.
- [ ] Kiminsə şərhinə görə `comment` bildirişinin düşməsi.
- [ ] Yeni izləyici gəldikdə `follow` bildirişinin düşməsi.
- [ ] Bildirişlər səhifəsini açdıqda `is_read = true` olaraq qeyd edilməsi.

### Mərhələ 9: Admin & Moderator Paneli
- [ ] İstifadəçi tərəfindən şikayətin göndərilməsi (`reports` cədvəlinə).
- [ ] Admin panelində şikayətlərin, postun və şikayət səbəbinin görünməsi.
- [ ] "Postu Gizlət" düyməsi ilə postun lentdən yığışdırılması (`is_hidden = TRUE`).
- [ ] "İstifadəçini Blokla" düyməsi ilə zərərverici istifadəçinin dondurulması (`is_banned = TRUE`).
- [ ] Adi istifadəçilərin admin panelinə daxil ola bilməməsi (RLS və rol yoxlanışı).

### Mərhələ 10: Mobil Uyğunluq
- [ ] Android streaming emulator-da tətbiqin qüsursuz işləməsi.
- [ ] Veb-versiyanın mobil telefon brauzerlərində (iPhone / Android) responsivliyi.
- [ ] Ekran ölçülərində heç bir horizontal daşmanın (overflow) olmaması.
