# Сайт кафедри комп'ютерної інженерії

Нова версія [ce.knu.ua](https://ce.knu.ua/). Зараз сайт тут: https://ihor-zakharov.github.io/ce-knu-site/

## Запуск

Через Docker (будь-яка ОС):

```sh
docker compose up
```

Відкрити http://localhost:4321. Зміни в коді видно одразу.

Без Docker потрібен Node.js 24:

```sh
npm ci
npm run dev
```

## Перед тим як відкрити PR

```sh
npm run verify
```

Перевіряє код і типи, збирає сайт. Те саме GitHub запускає для кожного PR.

## Як працюємо

1. Беремо задачу в Issues.
2. Створюємо гілку: `feature/12-news-page` (тип, номер задачі, опис).
3. Відкриваємо PR з назвою на кшталт `feat(news): add news list page`.
4. Хтось із команди робить рецензію, після зелених перевірок натискаємо Squash and merge.

Правила для людей і ШІ-агентів: [AGENTS.md](AGENTS.md).
