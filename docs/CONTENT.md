# Як додати новину

1. Покладіть фото в `src/assets/images/news/` (JPG або PNG, бажано до 3000 px; стиснення й сучасні формати зробить збирання).
2. Скопіюйте `docs/templates/news.md` у `src/content/news/uk/<коротка-назва>.md` і заповніть.
3. Зробіть англійську версію з тією самою назвою файла в `src/content/news/en/` (терміни — `docs/glossary.md`).
4. Створіть гілку `content/<назва>`, запит на злиття — CI збере сайт, перевірить повноту обох мов і покаже перегляд.

Можна без локального середовища: на GitHub → `src/content/news/uk` → **Add file** → **Create new file**, а фото — **Upload files**.
Назва файла стає адресою: `uk/open-day-2026.md` → `/posts/open-day-2026/` і `/en/posts/open-day-2026/`.

Чернетка, яку ще не треба показувати: `draft: true` у шапці.

# Як змінити сторінку чи профіль

Сторінки — `src/content/pages/{uk,en}/`, люди — `src/content/people/{uk,en}/` (порядок у списку — `order`, група — `group`).
Людина без власної сторінки — без поля `legacy`; людина, яку не показують у списку, — `unlisted: true`.
