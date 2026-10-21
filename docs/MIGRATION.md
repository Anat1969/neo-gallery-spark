# הגירה ל-CULTURA-GH (אוקטובר 2026)

יעד: פרויקט Supabase בשם CULTURA-GH (`ktqmwpbzcnzkhjskqisy`). שום טבלה או דלי קיים של אפליקציה אחרת לא שונו.

## 1. הגלריה (מקור: Lovable Cloud, `exammovsnvecymcdpsxw`)

| מקור | יעד ב-CULTURA-GH | שורות במקור | שורות ביעד |
|---|---|---|---|
| categories | neo_categories | 20 | 20 |
| galleries | neo_galleries | 91 | 91 |
| rooms | neo_rooms | 1 | 1 |
| artworks | neo_artworks | 1,005 | 1,005 |
| favorites | neo_favorites | 11 | 11 |
| user_roles (אדמין) | neo_admins | 1 | 1 |
| דלי artwork-images | דלי neo-gallery-images | 1,131 קבצים, 2,140 MB | 1,131 קבצים, 2,140 MB, אותו גודל לכל קובץ |

- כתובות התמונות ב-`neo_artworks.image_url` (987), ב-`neo_galleries.cover_image` (88) וב-`neo_rooms.cover_image` (1) שוכתבו לדלי החדש. כל כתובת מצביעה על קובץ קיים.
- מזהה המשתמש של ענת הוחלף במזהה שלה ב-CULTURA-GH.

## 2. פרויקט ה-Supabase הישן "neo-gallery-spark" (`slcpldoaaagkoozpbjsk`)

הפרויקט החזיק נתונים של אפליקציות אחרות. הכול הועתק באותם שמות בדיוק, עם אותה מדיניות RLS:

| טבלה | שורות |
|---|---|
| ashdod_plans | 41 |
| ashdod_shares | 40 |
| ashdod_muni | 2 |
| before_after_projects | 3 |
| tipim_personal_tips | 9 |
| tasks | 12 |
| captures | 10 |
| challenges | 20 |
| solutions | 60 |
| projects, user_projects, ai_query_log | 0 (נוצרו ריקות) |
| kadima.tasks | 3 |
| kadima.departments, task_steps, attachments, activity_log | 0 (נוצרו ריקות) |

| דלי | קבצים |
|---|---|
| ashdod-docs | 122 |
| before-after-images | 26 |
| moments | 16 |
| prompt-images | 12 |
| letter-images | 5 |
| solution-images, panarama-projects, kadima-files | 0 (נוצרו ריקים) |

- כתובת קובץ אחת בתוך `before_after_projects.data` שוכתבה לכתובת של CULTURA-GH.
- מזהה המשתמש של ענת (בטבלאות tasks ו-kadima.tasks) הוחלף במזהה שלה ב-CULTURA-GH. חשבון הבדיקה `verify...@gmail.com` לא הועבר, כי אין לו נתונים.
- לוג קבצים מלא: הטבלה `neo_migration_manifest` (כל קובץ, מקור, יעד וסטטוס).

## לפני מחיקת הפרויקט הישן
1. כל אפליקציה שקראה מ-`slcpldoaaagkoozpbjsk` (אשדוד, לפני-אחרי, משימות, קדימה, טיפים, רגעים, אתגרים) צריכה לעבור לכתובת ולמפתח של CULTURA-GH. שמות הטבלאות והדליים נשארו זהים, אז מספיק להחליף כתובת ומפתח.
2. אחרי זה אפשר למחוק את הפרויקט הישן ואת פרויקט ה-Lovable Cloud.
