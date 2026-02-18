<?php

$name = "Alice";
$age = 30;
$score = 95.5;

function greet($user, $greeting = "Hello") {
    $message = $greeting . " " . $user;
    $length = strlen($message);
    return $message;
}

$items = ["apple", "banana", "cherry"];
foreach ($items as $index => $item) {
    $upper = strtoupper($item);
    echo $upper;
}

$result = greet($name);
echo $result;
