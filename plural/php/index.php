<?php

function plural(int $count, array $words)
{
  $cases = [2, 0, 1, 1, 1, 2];
  return $words[
    $count % 100 > 4 && $count % 100 < 20 ? 2 : $cases[min($count % 10, 5)]
  ];
}