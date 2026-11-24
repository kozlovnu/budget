# Личный бюджет

Приложение для учёта денег: капитал, журнал операций, аналитика, прогноз, счета, долги.
Сайт размещён на GitHub Pages, данные хранятся в Firestore (Firebase) и доступны только после входа.
Устройство кода описано в [ARCHITECTURE.md](ARCHITECTURE.md).

В репозитории нет личных данных: суммы, счета и операции хранятся только в базе.

## Настройка Firebase (один раз)

1. Откройте [console.firebase.google.com](https://console.firebase.google.com) → **Создать проект** (например, `my-budget`). Google Analytics не нужен.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable** (только первый переключатель).
3. **Authentication → Users → Add user**: ваша почта и пароль. Это единственный аккаунт приложения.
4. **Authentication → Settings → User actions**: снимите **Enable create (sign-up)**, чтобы никто не мог зарегистрироваться сам. Если такого пункта нет, это не страшно: правила базы и так пускают каждого только в его собственную папку.
5. **Build → Firestore Database → Create database**, режим **Production**, регион ближе к вам (например, `europe-west`).
6. **Firestore → Rules**: замените текст содержимым файла [firestore.rules](firestore.rules) → **Publish**.
7. **Настройки проекта (шестерёнка) → General → Your apps → Web (`</>`)**: зарегистрируйте приложение (Hosting не включать) и скопируйте объект `firebaseConfig`.
8. Вставьте его в `js/core/firebase-config.js` вместо `window.FIREBASE_CONFIG = null;`.

## Публикация на GitHub Pages

**Settings → Pages → Source: Deploy from a branch → Branch: `main`, папка `/ (root)` → Save.**
Через минуту приложение откроется по адресу `https://<ваш-логин>.github.io/<репозиторий>/`.

На iPhone: откройте адрес в Safari → «Поделиться» → **На экран «Домой»**.

## Перенос данных из версии в Claude

1. В старой версии: **Настройки → О данных → Скачать все данные** (файл `budget-backup-….json`).
2. В новой версии после входа: **Настройки → О данных → Резервные копии → Восстановить из файла…** → проверить сводку → **Восстановить**.
3. Сверить капитал и остатки счетов в обеих версиях.

Файл копии содержит все ваши данные — не кладите его в репозиторий (он в `.gitignore`).

## Разработка

- Тесты расчётов: `node tests/run-node.js` или открыть `tests.html`.
- Тесты слоя базы: `node tests/cloud.test.js`.
- Обновить библиотеку Firebase: `cd tools && npm install && npm run build` (версия задана в `tools/package.json`).
