package main

import "fmt"

func add(a, b int) int {
    result := a + b
    return result
}

func main() {
    // Multi-variable short declaration
    width, height := 800, 600
    area := width * height

    // var declaration
    var message string = "Hello"

    // For-range
    numbers := []int{1, 2, 3, 4, 5}
    for index, value := range numbers {
        squared := value * value
        fmt.Println(index, squared)
    }

    fmt.Println(message, area)
}
