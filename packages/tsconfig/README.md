# @robonen/tsconfig

Базовый конфигурационный файл для TypeScript

## Установка

```bash
pnpm install -D @robonen/tsconfig
```

```json
{
  "extends": "@robonen/tsconfig/tsconfig.json"
}
```

## Описание основных параметров

```json
{
  "module": "Preserve",           // использовать ту же версию модуля, что и сборщик
  "noEmit": true,                 // не генерировать файлы
  "moduleResolution": "Bundler",  // разрешение модулей на основе сборщика
  "target": "ESNext",             // целевая версия JavaScript
  
  
  "skipLibCheck": true,                   // не проверять типы, заданные во всех файлах описания типов (*.d.ts)
  "esModuleInterop": true,                // создать хелперы __importStar и __importDefault для обеспечения совместимости с экосистемой Babel и включить allowSyntheticDefaultImports для совместимости с системой типов
  "allowSyntheticDefaultImports": true,   // разрешить импортировать модули не имеющие внутри себя "import default"
  "allowJs": true,                        // разрешить импортировать файлы JavaScript
  "resolveJsonModule": true,              // разрешить импортировать файлы JSON
  "moduleDetection": "force",             // заставляет TypeScript рассматривать все файлы как модули. Это помогает избежать ошибок cannot redeclare block-scoped variable»
  "isolatedModules": true,                // орабатывать каждый файл, как отдельный изолированный модуль
  "removeComments": true,                 // удалять комментарии из исходного кода
  "verbatimModuleSyntax": true,           // сохранять синтаксис модулей в исходном коде (важно при импорте типов)
  "useDefineForClassFields": true,        // использование классов стандарта TC39, а не TypeScript  
  "strict": true,                         // включить все строгие проверки (noImplicitAny, noImplicitThis, alwaysStrict, strictNullChecks, strictFunctionTypes, strictPropertyInitialization)
  "noUncheckedIndexedAccess": true,       // запрещает доступ к массиву или объекту без предварительной проверки того, определен ли он  
  "declaration": true,                    // генерировать файлы описания типов (*.d.ts)
  
  "composite": true,                      // указывает TypeScript создавать файлы .tsbuildinfo. Это сообщает TypeScript, что ваш проект является частью монорепозитория, а также помогает кэшировать сборки для более быстрой работы
  "sourceMap": true,                      // генерировать карту исходного кода
  "declarationMap": true                  // генерировать карту исходного кода для файлов описания типов (*.d.ts)
}  
```
