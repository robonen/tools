# stylistic preset

## Purpose

Форматирование через `@stylistic/eslint-plugin` (отступы, пробелы, скобки, переносы, TS/JSX-стиль).

## Defaults

- `indent: 2`
- `quotes: single`
- `semi: always`
- `braceStyle: stroustrup`
- `commaDangle: always-multiline`
- `arrowParens: as-needed`

## Key Rules

- `@stylistic/indent`, `@stylistic/no-tabs`.
- `@stylistic/quotes`, `@stylistic/semi`.
- `@stylistic/object-curly-spacing`, `@stylistic/comma-spacing`.
- `@stylistic/arrow-spacing`, `@stylistic/space-before-function-paren`.
- `@stylistic/max-statements-per-line`.
- `@stylistic/no-mixed-operators`.
- `@stylistic/member-delimiter-style` (TS).

## Examples

```ts
// ✅ Good
type User = {
  id: string;
  role: 'admin' | 'user';
};

const value = condition
  ? 'yes'
  : 'no';

const sum = (a: number, b: number) => a + b;

// ❌ Bad
type User = {
  id: string
  role: 'admin' | 'user'
}

const value = condition ? 'yes' : 'no'; const x = 1;
const sum=(a:number,b:number)=>{ return a+b };
```

Полный список правил и их настройки см. в `src/presets/stylistic.ts`.
