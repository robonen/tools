# AGENTS.md — UI Primitives

Руководство по работе с UI-пакетом примитивов. Описывает правила создания **новых компонентов** и **доработки существующих**. Применимо только к этому пакету (`vue/primitives/`).

> Прочитай этот файл **до** того, как трогать код в `src/`.

---

## 0. Tooling и команды

- **Менеджер пакетов:** `pnpm` (workspaces + catalogs).
- **Линтер и форматтер:** `eslint` (flat config, пресеты `@robonen/eslint`). Prettier/Biome не использовать.
- **Сборка:** `tsdown`.
- **Тесты:** `vitest` (jsdom + browser mode на `@vitest/browser-playwright` + Chromium).

```bash
pnpm exec vitest run                # jsdom-сьют
pnpm exec vitest run src/<name>     # один компонент
pnpm run test:browser               # browser mode (Playwright)
pnpm exec tsdown                    # сборка ESM + CJS + .d.ts
pnpm lint:check / pnpm lint:fix     # eslint
```

---

## 1. Структура пакета

```
src/
  <component>/                # kebab-case
    <Component>Root.vue       # PascalCase, корневой провайдер контекста
    <Component><Part>.vue     # части (Trigger / Content / Item / Indicator…)
    context.ts                # фабрика + типы контекста
    index.ts                  # барель
    __test__/
      <Component>.test.ts     # jsdom-тесты
      <Component>.browser.test.ts   # опционально, если нужен реальный браузер
  utils/                      # общие хелперы (roving-focus, getRawChildren …)
  primitive/                  # polymorphic <Primitive :as="…">
  index.ts                    # реэкспорт всех компонентов
```

**Правила структуры:**

- Каждый примитив = отдельная папка. Никаких «всё в одном файле».
- Имя папки — `kebab-case`, файлы — `PascalCase.vue`.
- Корневой компонент **обязан** называться `<Name>Root.vue` и быть провайдером контекста.
- Никаких циклических зависимостей между примитивами. Общий код — в `src/utils/`.
- `index.ts` примитива экспортирует **все** компоненты + контекст-хук + типы.
- После создания примитива добавь `export * from './<name>';` в `src/index.ts`.

---

## 2. Нейминг и data-атрибуты

В коде, комментариях, доках, тестах и коммитах **не должно быть имён сторонних UI-библиотек** и внутренних кодовых названий бренда/форка. Описывай компоненты через их роль (`dialog`, `radio-group`, `spinbutton`) и паттерн (`roving-focus`, `dismissable-layer`).

| Артефакт | Формат |
|---|---|
| Имя контекста | `'<component>'` — аргумент в `useContextFactory('<component>')` |
| ID-префикс | `'<component>-<part>'` — аргумент в `useId(undefined, '<component>-<part>')` |
| Data-атрибуты состояния | `data-state`, `data-disabled`, `data-orientation`, `data-side`, `data-align` |

`data-state` — каноническое отражение состояния:
- toggle/checkbox: `"checked" | "unchecked" | "indeterminate"`
- collapsible/dialog/popover: `"open" | "closed"`
- progress: `"complete" | "loading" | "indeterminate"`

Любая интерактивная часть с `disabled` получает `data-disabled=""` (без значения), чтобы CSS-селектор `[data-disabled]` работал одинаково.

---

## 3. Архитектурные паттерны

### 3.1. Контекст — только через фабрику

**Ручные `Symbol`, `InjectionKey`, `provide()`/`inject()` в коде примитивов запрещены.** Контекст создаётся **только** через `useContextFactory` из тулкита. Фабрика:

- единообразно генерирует ключ (`Symbol(name)` внутри неё),
- типизирует `provide` и `inject` одним generic-аргументом,
- бросает консистентную ошибку, если `inject` делается без предка-провайдера,
- поддерживает `appProvide(app)` для глобальных провайдеров (config, dir, и т.п.).

```ts
// context.ts
import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '<toolkit>';

export interface FooContext {
  open: Ref<boolean>;
  disabled: ComputedRef<boolean>;
  onToggle: () => void;
}

export const {
  inject: useFooContext,
  provide: provideFooContext,
} = useContextFactory<FooContext>('foo');
```

```ts
// FooRoot.vue
provideFooContext({ open, disabled, onToggle });

// FooTrigger.vue
const ctx = useFooContext();            // кидает, если нет <FooRoot>
const ctx = useFooContext(fallback);    // опционально: дефолт без ошибки
```

**Правила:**

- Никаких ручных `Symbol(...)` / `InjectionKey<...>` в папке примитива.
- Имя фабрики описательное (`'foo'`, `'foo-item'`, `'dialog'`), без префиксов брендов.
- Контекст хранит **`Ref` / `ComputedRef`** для реактивных полей и **функции** для действий. Не передавай голые значения — потеряешь реактивность у потребителей.
- Для per-item данных (например, `RadioGroupIndicator` смотрит на свой `RadioGroupItem`) создавай **item sub-context** отдельной фабрикой (`useContextFactory<ItemCtx>('foo-item')`). Не ходи по DOM ради `data-*`.
- Контекст-хук и типы экспортируются из `index.ts` примитива.

### 3.2. v-model: продвинутая работа с `defineModel`

`defineModel` — первичный инструмент для любой двусторонней связи со state. Используем его продвинутые возможности.

#### 3.2.1. Контролируемый + неконтролируемый режим через get/set

Вместо ручного `ref + computed`-обёртки используй **`defineModel({ get, set })`** — встроенный способ навесить преобразование/нормализацию прямо на модель:

```ts
interface Props {
  defaultOpen?: boolean;
}
const { defaultOpen = false } = defineProps<Props>();
const local = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  // когда родитель не связал v-model — читаем локальный стейт
  get: (external) => external ?? local.value,
  // пишем и наружу (emit), и в локальный стейт
  set: (value) => {
    local.value = value;
    return value;
  },
});
```

- Если `v-model` не привязан снаружи — `defineModel` эмитит `update:open` в пустоту, а локальный ref обеспечивает работу компонента. Это и есть «uncontrolled» режим.
- Если привязан — родитель writable source of truth, локальный ref просто зеркалит его через `get`.
- Никаких отдельных `computed({ get, set })` поверх `defineModel` — всё делается в одном месте.

#### 3.2.2. Модификаторы v-model

Поддерживай пользовательские модификаторы, если это осмысленно для примитива (`trim`, `lazy`, `number`, кастомные):

```ts
const [model, modifiers] = defineModel<string>({
  set: (value) => (modifiers.trim ? value.trim() : value),
});
```

Любой кастомный модификатор документируется в README примитива.

#### 3.2.3. Нормализация union-значений

Для union-типов (`string | string[]`, `number | null`, …) ставь преобразование в `set`, а наружу эмить нормализованный вид. Если Vue не может вывести тип модели или теряет записи — **fallback: explicit `modelValue` prop + `emit('update:modelValue', …)` + `watch(() => props.modelValue, …)`**:

```ts
interface Props { modelValue?: string | string[] }
const props = withDefaults(defineProps<Props>(), { modelValue: undefined });
const emit = defineEmits<{ 'update:modelValue': [v: string[] | string | undefined] }>();

const local = shallowRef<string[]>(normalize(props.modelValue));
watch(() => props.modelValue, (v) => { local.value = normalize(v); });

function commit(next: string[]) {
  local.value = next;
  emit('update:modelValue', serialize(next));
}
```

Это обход, а не правило — **сначала попробуй `defineModel({ get, set })`**.

### 3.3. Продвинутая реактивность

Используй реактивность по полной — она бесплатная и устраняет ручной оркестр watch-ей.

| Задача | Инструмент |
|---|---|
| Ссылка на элемент шаблона | `useTemplateRef('name')` (Vue 3.5+), не `ref<HTMLElement>()` |
| Развернуть `MaybeRef<T>` | `toValue(source)` — работает и с функциями, и с refs |
| Реактивное значение из пропса | `toRef(() => props.foo)` (getter-форма, не строковая) |
| Большой список/мап, не нужна глубокая реактивность | `shallowRef` / `shallowReactive` |
| Гонки с внешним state | `watchSyncEffect` / `watch(..., { flush: 'sync' })` (осторожно) |
| «Один раз при создании» | `computed` с кэшированием, **не** вызов функции в template |
| Escape-hatch от трекинга | `markRaw`, `readonly`, `customRef` (если реально нужен дебаунс/throttle) |
| Очистка эффектов у регистров | `effectScope` + `onScopeDispose`, не `onBeforeUnmount` в циклах |
| DOM-измерения при ресайзе/скролле | `useResizeObserver`, `useEventListener`, `useMutationObserver` |

Типовые практики:

- **Props через getter.** `watch(() => props.value, …)` и `toRef(() => props.value)` — не деструктурируй пропсы в локальные переменные (сломаешь реактивность).
- **Computed для derived state.** Любой `data-state` / `aria-*` / классовая строка — `computed`, не вычисление в `<template>`.
- **Effect scope для регистров.** Если корень хранит массив дочерних элементов (`items: Ref<HTMLElement[]>`), регистрация/снятие идёт через пару `register(el) + onScopeDispose(() => unregister(el))` в child — scope снимет подписку автоматически при размонтировании ветки.
- **`watch` с `immediate: true`** — когда sync-реакция нужна сразу; иначе первая синхронизация делается отдельно.
- **`watchEffect` vs `watch`.** `watchEffect` — для реактивных деревьев без явного источника; `watch` — когда важна старая-новая пара и источник известен.
- **`shallowRef` для ссылок на массивы/объекты**, которые меняются целиком (replace), — меньше лишних триггеров.

### 3.4. Roving focus

Для коллекций фокусируемых элементов (Toolbar, RadioGroup, ToggleGroup, NavigationMenu …) используй `src/utils/roving-focus.ts`:

- `rovingKeyToAction(event, { orientation, dir, loop })` → `{ delta, absolute? } | null`
- `resolveNextIndex(current, delta, count, loop)` — wrap-or-clamp

Items сами регистрируются в Root через item sub-context (`useContextFactory`). Root хранит `Ref<HTMLElement[]>` и `activeIndex`. Фильтрация disabled:

```ts
const enabled = items.value.filter(x => !x.hasAttribute('data-disabled'));
```

`tabindex`: активный/выбранный = `0`, остальные = `-1`.

### 3.5. ID и ARIA

- ID генерируй через `useId(undefined, '<component>-<part>')` из тулкита. Один ID — один reactive ref.
- Роли — по WAI-ARIA APG (`role="dialog"`, `role="radiogroup"`, `role="spinbutton"`, …).
- `Title` / `Description` регистрируют свой ID в контексте Root; Root прокидывает их в `aria-labelledby` / `aria-describedby` контента.

### 3.6. Slots, polymorphism, forwarding

- Корень обычно не рендерит DOM, кроме `<slot>` со scope-параметрами:
  ```vue
  <template><slot :open="open" :close="() => open = false" /></template>
  ```
- **`Primitive` из `src/primitive/`** — базовый polymorphic-рендерер. Любая часть, рендерящая DOM, обязана прокидывать `as` через `Primitive`, а не рендерить тег напрямую. `as="template"` включает режим slot-merging (merged props + один дочерний элемент из слота — аналог `asChild`).
- **Доступ к элементу + проброс ref** — `useForwardExpose` из тулкита. Он даёт `{ forwardRef, currentElement }`: `forwardRef` привязывается к `Primitive` (`:ref="forwardRef"`), `currentElement` — реактивный `Ref<HTMLElement>`, работает даже при `as="template"` и условных рендерах (`v-if`/`v-else`).
- **`inheritAttrs: false`** на Root (через `defineOptions`), если Root не рендерит DOM — attrs не должны утекать на `<slot>`.
- **Минимум DOM:** не оборачивай контент лишними `<div>`-обёртками.

### 3.7. Утилиты — выноси, а не копируй

Паттерн повторяется в ≥2 примитивах → в `src/utils/`. Уже доступно:

- `roving-focus.ts` — клавиатурная навигация по коллекции
- `getRawChildren.ts` — VNode walk для slotted children

Не дублируй helper'ы внутри папок примитивов.

### 3.8. Composition-слои внутри одного примитива

Сложные примитивы (Dialog / Popover / Select) разбиваются на слои композиции, а не ветвятся внутри одного компонента.

- **`<Name>Content.vue`** — публичный wrapper: решает, какой внутренний импл рендерить на основе `modal`/`nonModal`/`forceMount`.
- **`<Name>ContentImpl.vue`** — общая часть (focus scope, dismiss layer, ариа-связки).
- **`<Name>ContentModal.vue` / `<Name>ContentNonModal.vue`** — ветки, отличающиеся только scroll-lock / `aria-hidden` соседей / трап фокуса.
- **`<Name>Overlay.vue` + `<Name>OverlayImpl.vue`** — такая же пара, если overlay нужен только в модальном режиме.

Результат: каждый файл плоский, без `v-if`-деревьев веток по режиму, и легко тестируется по отдельности.

### 3.9. Ordered collection вместо ручного реестра

Когда порядок элементов важен (roving focus, typeahead, indexOf), **не держи ручной `items: Ref<HTMLElement[]>` с push/splice** — порядок ломается при перепаковке детей. Используй паттерн:

1. Каждый item выставляет дата-атрибут (например `data-collection-item=""`).
2. `itemMap: Ref<Map<HTMLElement, ItemData>>` в контексте — регистрация через `watchEffect(cleanup)` в child:
   ```ts
   watchEffect((onCleanup) => {
     const el = currentElement.value
     if (!el) return
     const key = markRaw(el)
     ctx.itemMap.value.set(key, { ref: el, value: props.value })
     onCleanup(() => ctx.itemMap.value.delete(key))
   })
   ```
3. `getItems()` считывает текущий DOM-порядок через `querySelectorAll('[data-collection-item]')` и сортирует значения мапы по `indexOf`.
4. `markRaw(el)` обязательно — иначе Vue сделает DOM-узел реактивным и сломает производительность.

### 3.10. Presence и анимации выхода

Для любого примитива, у которого часть может иметь exit-анимацию (Dialog.Content, Collapsible.Content, Popover.Content, …) рендер идёт через `Presence` из `src/presence/`:

- `<Presence :present="open">` монтирует слот при `present=true` и удерживает его, пока CSS-анимация не завершилась после `present=false`.
- Пропс `forceMount` — обязательный escape-hatch, для случаев, когда пользователь хочет держать DOM в дереве принудительно (например, для measurement).
- Императивный малый FSM для состояний `mounted` / `unmountSuspended` / `unmounted` — через `useStateMachine` (если добавим) или локально, но кратко и декларативно.

### 3.11. Single-or-multiple абстракция

Компоненты типа `Accordion` / `ToggleGroup` / `Combobox`, поддерживающие оба режима, делают это **через единый хелпер**, а не двумя ветками. Правила:

- Тип выводится из фактического `modelValue`/`defaultValue` (`Array` → multiple, иначе single).
- Явный `type="single" | "multiple"` перекрывает вывод, но если значение конфликтует — логируем warning и следуем типу значения.
- Единая функция `change(v)`: в single — переключает/сбрасывает; в multiple — добавляет/удаляет из массива.
- Сравнение значений — через deep equality (`ohash.isEqual` или аналог), а не `===`, иначе объектные значения не будут тоглиться.

### 3.12. Shared composables для глобальных стеков

Состояния уровня документа (scroll-lock, focus-scope stack, dismissable-layer stack, aria-hide других узлов) должны быть **одним экземпляром на приложение**, иначе два Dialog'а записывают `overflow: hidden` поверх друг друга и теряют исходное значение.

- Используй `createSharedComposable` (VueUse) для таких хелперов.
- Храни внутри counter / Map по ID лайера — фактический lock/hide включается, пока хотя бы один потребитель активен.
- Снимай побочные эффекты на эффект-скоупе последнего подписчика, не в `onBeforeUnmount` каждой копии.
- SSR: все такие композаблы guards'ят на `isClient` / `typeof document !== 'undefined'`.

### 3.13. ConfigProvider и глобальные настройки

Всё, что логично задавать раз на дерево (направление `dir`, кастомный `useId`, `nonce` для CSP, `scrollBody` конфиг), живёт в `ConfigProvider`. Правила:

- Примитив читает такие настройки через `inject` с **фолбэком-дефолтом** (`inject(fallback)`), а не бросает, если provider не стоит.
- Личный проп на Root перекрывает глобальную настройку (локальный `dir` на Popover > глобальный `dir`).
- `useId` из тулкита уже учитывает `ConfigProvider.useId` — не дублируй логику внутри компонента.

### 3.14. Focus и dismiss — всегда через примитивы, не ручной код

- **`FocusScope`** — любой modal/popover/menu оборачивает `Content` в `FocusScope` с `trapped` и/или `loop`. Ручный trap-код в компоненте запрещён.
- **`DismissableLayer`** — все escape/pointer-outside/focus-outside диспетчеры идут через этот компонент и его stack — иначе вложенный Popover закроет оба уровня по Esc.
- **`FocusGuards` / visually-hidden sentinel'ы** — в краях portaled-контента, чтобы tab не убегал в URL-бар браузера.
- **`useHideOthers`** (aria-hidden соседних деревьев) — для modal-Content, чтобы screen reader не уходил за пределы.

---

## 4. Стиль кода (eslint + @stylistic)

- Всегда `<script setup lang="ts">`. Composition API. Options API запрещён.
- Отдельный `<script lang="ts">` блок допускается **только** для экспорта типов/интерфейсов пропсов наружу.
- Импорты типов — через `import type { … }`.
- Не пиши docstring/комментарии к коду, который не меняешь. Не добавляй type-аннотации сверх необходимого.
- Не добавляй ненужный error handling «на всякий случай» — валидируй только на границах (props, входные DOM events).
- Без default exports в `.ts`. В `.vue` — только дефолтный экспорт компонента (через `<script setup>`).

После любых правок: `pnpm lint:fix`.

---

## 5. Тесты

### 5.1. Структура

- jsdom-тесты: `src/<component>/__test__/<Component>.test.ts`.
- `@vue/test-utils` (`mount`) + `vitest`.
- Требуется реальный focus-менеджмент / pointer events / scroll-lock / `inert` / IntersectionObserver → добавь browser-сьют.

### 5.2. Минимум сценариев для нового примитива

1. Корректный ARIA-каркас (`role`, `aria-*`, `data-state`).
2. Контролируемый режим (`v-model` обновляется → DOM реагирует).
3. Неконтролируемый режим (`default*` пропс задаёт начальное состояние).
4. Все интерактивные действия (click / keyboard).
5. Клавиатура: Enter/Space/Arrow*/Home/End/Esc — в зависимости от паттерна.
6. `disabled` блокирует мутации.
7. Edge-cases: пустые массивы, null, экстремальные min/max.
8. Модификаторы v-model, если поддерживаются (`trim`, кастомные).

### 5.3. Хелперы и гочи jsdom

```ts
function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

// jsdom: DataTransfer не определён — стабь clipboardData вручную:
const event = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'text' } });
```

- Всегда `attachTo: document.body`, иначе focus-тесты ломаются.
- После каждого теста `wrapper.unmount()`.
- `await nextTick()` после программных мутаций перед assert'ом.
- Не используй `vi.useFakeTimers()` без необходимости.

### 5.4. Browser mode

- Файл: `src/<component>/__test__/<Component>.browser.test.ts`.
- Запуск: `pnpm run test:browser`.
- Перед коммитом прогоняй оба сьюта, если затронут focus/inert/scroll.

---

## 6. Workflow для нового примитива

1. **Спецификация.** WAI-ARIA APG для паттерна — единственный источник истины по ARIA/клавиатуре.
2. **Скаффолдинг папки** (`<name>/context.ts`, `<Name>Root.vue`, парты, `__test__/`, `index.ts`).
3. **Контекст** через `useContextFactory` — сначала определи поля и действия, потом пиши компоненты.
4. **Root** — модель состояния (`defineModel` с `get/set` или fallback-паттерн), `provide*Context`.
5. **Parts** — каждая часть тонкая, без дублирующего state.
6. **Тесты** пиши параллельно с кодом, не «потом».
7. **Регистрация в `src/index.ts`.**
8. **Локальный прогон:** `pnpm exec vitest run src/<name>` → 0 fail.
9. **Полный прогон:** `pnpm exec vitest run` (+ `test:browser` при необходимости).
10. **Сборка:** `pnpm exec tsdown` — проверь, что bundle не вырос аномально и `.d.ts` валиден.
11. **Линт:** `pnpm lint:fix`.
12. **Обнови session-память** (`/memories/session/progress-log.md`), если идёт многошаговая работа.

---

## 7. Доработка существующего компонента

- **Не ломай публичный API без миграции.** Имена пропсов/событий/контекстных полей — semver'но значимы.
- **Не добавляй фичи «попутно».** Меняй только то, что просили.
- **Сначала прочитай тесты** — они описывают контракт.
- **Расширил поведение → добавь тест.** Любое новое условие/ветка покрывается.
- **Удалил поведение → удали тест** и упомяни в PR-описании.
- **Баг в shared-утилите** (`utils/roving-focus`, `utils/getRawChildren`) — фикси в утилите, а не локально.
- **Регрессии:** при правке логики прогоняй **весь** sweep пакета.

---

## 8. Что **не** делать

- ❌ Тянуть внешние UI-зависимости (Radix, Headless UI, Ark, floating-vue, …). Все примитивы — свои.
- ❌ Создавать `Symbol(...)` / `InjectionKey<...>` вручную в папке примитива — только `useContextFactory`.
- ❌ Вызывать `provide()` / `inject()` из `vue` напрямую — только через `useContextFactory`.
- ❌ Писать имена сторонних UI-библиотек и внутренние кодовые имена бренда/форка в коде/доках/тестах.
- ❌ Деструктурировать пропсы в переменные (теряется реактивность); используй getter-форму и `toRef(() => props.x)`.
- ❌ Дублировать стейт между `defineModel` и локальным ref — используй `get/set` на модели.
- ❌ Класть бизнес-логику в `<template>` — выноси в `computed` / функции.
- ❌ Полагаться на DOM-walk для чтения данных у соседей — используй context / sub-context.
- ❌ `pnpm install <pkg>` без согласования: новые рантайм-зависимости должны проходить через catalog.
- ❌ Создавать markdown-документацию по компоненту без запроса.
- ❌ `git push --force`, `git reset --hard`, удалять файлы без подтверждения.
- ❌ `--no-verify` и обход pre-commit хуков.

---

## 9. Memory-протокол для агентов

- Большая задача (≥3 шага) — план в `/memories/session/plan.md`.
- Этап завершён — прогресс в `/memories/session/progress-log.md`.
- Repo-факты, верифицированные на практике (команды, версии, гочи) — в `/memories/repo/`.
- Встретил гочу, которая проявится снова — добавь её в этот `AGENTS.md` (§3 или §5.3).

---

## 10. Чеклист перед PR

- [ ] Папка примитива оформлена по §1.
- [ ] Контекст только через `useContextFactory`, 0 ручных `Symbol` / `InjectionKey`.
- [ ] v-model через `defineModel({ get, set })` (или обоснованный fallback по §3.2.3).
- [ ] Реактивность: `toValue` / `toRef(() => props.x)` / `useTemplateRef` вместо ручных паттернов.
- [ ] Полиморфизм через `Primitive` + `useForwardExpose`, не ручные teg-свитчи.
- [ ] Для анимируемых частей (Content/Overlay) использован `Presence`.
- [ ] Modal/popover-примитивы завёрнуты в `FocusScope` + `DismissableLayer`, не ручные листенеры.
- [ ] Глобальные стеки (scroll-lock, hide-others, focus-stack) — через shared composables, 0 дублирующегося state.
- [ ] Roving-focus через `src/utils/roving-focus.ts`, если применимо.
- [ ] ARIA-роли и `data-state` — соответствуют APG.
- [ ] Тесты: минимум из §5.2, всё зелёное.
- [ ] Browser-сьют не сломан (если затронут focus/inert/scroll).
- [ ] `pnpm exec tsdown` собирается, `.d.ts` валиден.
- [ ] `pnpm lint:fix` без diff'а.
- [ ] Никаких имён сторонних UI-либ и внутренних кодовых имён бренда.
- [ ] `src/index.ts` обновлён.
