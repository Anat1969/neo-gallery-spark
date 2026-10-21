# ART-AI גלריה (neo-gallery-spark)

הגלריה הדיגיטלית של ענת: קטגוריות, גלריות, חדרים ויצירות. Vite + React + TypeScript + Tailwind + framer-motion, עברית ו-RTL.

## נתונים
- Supabase: הפרויקט המשותף **CULTURA-GH** (`ktqmwpbzcnzkhjskqisy`). לא Lovable Cloud ולא הפרויקט הישן.
- כל הטבלאות של האפליקציה בקידומת `neo_`: `neo_categories`, `neo_galleries`, `neo_rooms`, `neo_artworks`, `neo_favorites`, `neo_admins`. הדלי: `neo-gallery-images`.
- אסור לגעת בטבלאות או בדליים של אפליקציות אחרות בפרויקט המשותף.
- RLS: קריאה ציבורית, כתיבה לאדמין בלבד דרך `public.neo_is_admin()` (לפי `user_id` או אימייל בטבלת `neo_admins`). מועדפים: כל משתמש רואה וכותב רק את שלו.
- כניסה: Google כבוי ב-CULTURA-GH, לכן כניסה בקישור חד־פעמי למייל (`signInWithOtp`, `shouldCreateUser: false`), לחשבונות קיימים בלבד.

## היסטוריית הגירה (2026-10)
- המקור של הגלריה היה Lovable Cloud (`exammovsnvecymcdpsxw`): 20 קטגוריות, 91 גלריות, חדר אחד, 1,005 יצירות, 11 מועדפים, 1,131 תמונות. הכול הועתק ל-`neo_*`, והכתובות של התמונות שוכתבו לדלי `neo-gallery-images` ב-CULTURA-GH.
- פרויקט ה-Supabase הישן בשם neo-gallery-spark (`slcpldoaaagkoozpbjsk`) החזיק נתונים של אפליקציות אחרות (ashdod_*, before_after_projects, tasks, captures, challenges, solutions, tipim_personal_tips, סכמת kadima ועוד) ו-181 קבצים ב-8 דליים. הכול הועתק ל-CULTURA-GH באותם שמות בדיוק (אין התנגשויות), כולל מדיניות RLS. ראו `docs/MIGRATION.md`.
- אחרי ההגירה מותר למחוק את הפרויקט הישן, אחרי שכל אפליקציה שהשתמשה בו הועברה ל-CULTURA-GH.

## רכיבים קבועים
- סרגל עליון קבוע (`AppHeader`) בכל הדפים, z-index מעל חלונות; חלונות ומגירות נפתחים מתחתיו.
- הלוגו הדינמי "ענת" (`AnatLogo`): קו שמצויר, ברק שמסתובב לפי שעת היום, שלושה מישורים שנוטים אחרי העכבר.
- בסרגל: העתקת קישור (הכתובת הנוכחית), שיחת הפיתוח, התקנת האפליקציה (כש-Chrome מציע).
- PWA: `public/manifest.webmanifest`, `public/sw.js` (דפים מהרשת, תמונות ונכסים מהמטמון), אייקון בלי טקסט.
- פס עריכה צף לאדמין (`EditModeToggle`).

## שפת עיצוב
- גרפיט אדריכלי, עומק, צל, שכבות, גרדיאנטים. IBM Plex Sans Hebrew דק לכותרות, IBM Plex Mono לתוויות.
- בלי אייקונים, בלי חריגים.

## בדיקה ופריסה
- `npm run build`, `npm test`, ובדיקת Playwright מול `vite preview --host 127.0.0.1` עם מוקים לכל קריאות Supabase.
- Vercel: הפרויקט `neo-gallery-spark`, ענף הייצור main. מיזוג ל-main מעדכן את הכתובת הראשית. ענת אישרה מיזוג קבוע אחרי בדיקה ירוקה.
- Lovable כבר לא מקור האמת. לא לייצר מחדש את `src/integrations/supabase/client.ts` מ-Lovable.
