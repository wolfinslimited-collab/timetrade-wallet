## Plan: ساده‌سازی لاگین و حذف باگ صفحه عجیب بعد از Google auth

### هدف
یک صفحه لاگین واقعی برای اپ بسازیم و جریان فعلی Google sign-in را از حالت پیچیده و خراب خارج کنیم، طوری که کاربر دیگر هیچ‌وقت صفحه خطا یا پیام `Safari cannot open the page because the address is invalid` را نبیند.

### مشکل دقیق فعلی
باگ اصلی از اینجاست که بستن مرورگر بعد از Google auth به لینک `com.wallet.ai://oauth-done` وابسته شده، ولی ثبت native این لینک در پروژه کامل نیست:
- در `AndroidManifest.xml` هیچ `VIEW intent-filter` برای این scheme وجود ندارد.
- در بخش iOS هم ثبت URL scheme لازم در فایل‌های native فعلاً دیده نمی‌شود.
- نتیجه: وقتی صفحه OAuth می‌خواهد اپ را با این لینک باز کند، iOS آن را معتبر نمی‌شناسد و همان خطای Safari را نشان می‌دهد.

### کاری که انجام می‌دهم
1. **جریان فعلی OAuth موبایل را ساده می‌کنم**
   - کد bridge فعلی (`native_oauth`, `oauth-done`, bounce logic) را از مسیر لاگین حذف می‌کنم.
   - دیگر هیچ صفحه واسط یا deep-link موقتی به کاربر نشان داده نمی‌شود.

2. **یک صفحه لاگین اختصاصی می‌سازم**
   - مسیر جدا مثل `/login` برای ورود کاربر ایجاد می‌کنم.
   - فرم تمیز برای:
     - Sign in
     - Create account
     - Forgot password
   - از همان APIهای ایمیل/پسورد موجود در `useTradingApi` استفاده می‌شود.

3. **ورودی AI Trading را به صفحه لاگین وصل می‌کنم**
   - اگر کاربر لاگین نباشد، به‌جای نمایش UI ناقص یا تلاش برای OAuth خراب، مستقیم به `/login` می‌رود.
   - بعد از لاگین موفق، کاربر خودکار برمی‌گردد به داشبورد trading.

4. **Google sign-in را برای موبایل موقتاً از مسیر خراب خارج می‌کنم**
   - روی native app، یا دکمه Google را موقتاً مخفی می‌کنم یا غیرفعال می‌کنم تا دیگر این باگ دیده نشود.
   - روی web می‌توانیم Google را نگه داریم چون آنجا این مشکل native close-flow را ندارد.

5. **اگر بخواهیم Google روی native هم بماند، native config را درست می‌کنم**
   - Android: اضافه کردن `intent-filter` برای custom scheme
   - iOS: ثبت `CFBundleURLTypes`
   - سپس فقط بعد از اینکه scheme واقعاً معتبر شد، browser close flow را دوباره فعال می‌کنم
   - این بخش را فقط به‌صورت درست و کامل انجام می‌دهم، نه با workaround نیمه‌کاره

### نتیجه‌ای که می‌گیرید
```text
User opens app
  -> sees proper login page
  -> signs in with email/password
  -> enters app directly
  -> no weird callback page
  -> no Safari invalid address alert
  -> no stuck browser screen
```

### Technical details
- فایل‌های اصلی که تغییر می‌کنند:
  - `src/App.tsx`
  - `src/hooks/useTradingApi.ts`
  - `src/pages/AITradingPage.tsx`
  - یک صفحه جدید لاگین مثل `src/pages/LoginPage.tsx`
  - فایل‌های native برای deep link اگر Google native را نگه داریم:
    - `android/app/src/main/AndroidManifest.xml`
    - فایل تنظیمات iOS URL scheme
- بعد از اعمال تغییرات native، لازم است:
  - `npm run build`
  - `npx cap sync ios` / `npx cap sync android`
  - و اپ دوباره build شود

### پیشنهاد اجرایی
برای اینکه سریع و تمیز از این loop بیرون بیاییم، اول **صفحه لاگین واقعی + ایمیل/پسورد** را مسیر اصلی می‌کنم و باگ فعلی Google را از جلوی کاربر برمی‌دارم. بعد اگر خواستید، Google native را جداگانه و درست برمی‌گردانم.