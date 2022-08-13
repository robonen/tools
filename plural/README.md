# Функция изменения формы слов в зависимости от числительного

Часто встречается задача вывода правильного окончания слова с предшествующим ему числом. 

Например:

- 1 депутат
- 2–4 депутат**а**
- 0, 5-9 или 10 депутат**ов**

## Примеры исользования

### Typescript
```typescript
import { plural } from 'plural';

const totalOrders = 2;

const words = ['заказ', 'заказа', 'заказов'];

const result = `${totalOrders} ${plural(totalOrders, words)}`;

console.log(result); // 2 заказа
```

### PHP
```php
include 'plural.php';

$totalOrders = 2;

$words = ['заказ', 'заказа', 'заказов'];

$result = "{$totalOrders} {plural($totalOrders, $words)}";

echo result; // 2 заказа
```
