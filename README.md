# My Zangetsu Sources

مستودع مصادر JavaScript لتطبيق Zangetsu. يحتوي حالياً على مصادر بيانات وصفية، ومصدرين تجريبيين لتشغيل فيديوهات Internet Archive التي تعلن عن رخصة Public Domain أو Creative Commons.

## المصادر

| المعرّف | المحتوى | التشغيل |
|---|---|---|
| `archive-licensed-movies` | فيديوهات وأفلام وأعمال تلفزيونية مفهرسة في Internet Archive | روابط MP4/WebM/MKV المباشرة عند توفرها |
| `archive-licensed-anime` | نتائج أنمي مفهرسة في Internet Archive وتحمل رخصة مقبولة | روابط الفيديو المباشرة عند توفرها |
| `kitsu-anime` | بيانات الأنمي والحلقات والصور | بيانات فقط |
| `tvmaze-series` | بيانات المسلسلات والحلقات والصور | بيانات فقط |

**حدود مهمة:** هذا ليس كتالوجاً تجارياً شاملاً، ولا يضمن وجود حلقات مرتبة بمواسم للمسلسلات. محتوى Internet Archive متفاوت وقد لا يتوفر لكل عنوان. المصدر لا يزيل DRM ولا يتجاوز تسجيل الدخول أو الحماية. لا ندرج في النتائج إلا العناصر التي تحتوي على رابط رخصة Public Domain أو Creative Commons، لكن بيانات الحقوق يضيفها رافع الملف ولا تتحقق Internet Archive من ملكية الرافع للحقوق؛ افحص صفحة كل عنصر وشروط رخصته قبل الاستخدام.

## التثبيت

أضف رابط الفهرس في Zangetsu → Settings → Sources → Add repo:

```
https://raw.githubusercontent.com/2bm9kdbtsh-hue/my-zangetsu-sources/main/index.json
```

ثم حدّث المستودع وثبّت:
- Internet Archive Licensed Movies & TV
- Internet Archive Licensed Anime

## ملاحظات التوافق

- أنواع Zangetsu المدعومة في الفهرس هي `anime` و`movie` و`manga` و`novel`.
- تُسجّل بيانات TVmaze تحت `movie` للتوافق مع النوع الذي يدعمه التطبيق، لكنها تظل بيانات مسلسلات فقط.
- مصادر Internet Archive تستخدم واجهات القراءة العامة: `/advancedsearch.php` و`/metadata/{identifier}`، وروابط الملفات من `/download/{identifier}/{filename}`.
- صيغة التشغيل المستخدمة هي قائمة `VideoSource` المتوافقة مع Zangetsu: `url`, `quality`, `label`, `container`, `kind`.
- لا نضع مفاتيح API أو بيانات دخول في المستودع.

## التحقق

يشغّل GitHub Actions فحص JSON ومسارات الملفات والدوال الأساسية. اجتياز الفحص لا يعني اختبار التشغيل على جهاز iPad؛ يجب تجربة عنوان مرخّص فعلياً داخل التطبيق.

## واجهات البيانات

- Internet Archive: https://archive.org/developers/
- Kitsu: https://kitsu.docs.apiary.io/
- TVmaze: https://www.tvmaze.com/api

## الترخيص

كود هذا المستودع مرخّص MIT. تراخيص ملفات الفيديو والصور والبيانات تظل خاضعة لرخصة كل عنصر ومصدره، ولا يمنح ترخيص الكود أي حقوق إضافية على المحتوى.
