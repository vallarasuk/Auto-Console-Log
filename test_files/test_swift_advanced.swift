import Foundation

// Type annotations
var age: Int = 25
let pi: Double = 3.14159
var isEnabled: Bool = true

// Optional and guard let
func processOptional(value: String?) -> String {
    guard let unwrapped = value else {
        return "nil"
    }
    let result = unwrapped.uppercased()
    return result
}

// if let
func safeConvert(text: String) -> Int? {
    if let number = Int(text) {
        let doubled = number * 2
        return doubled
    }
    return nil
}

// For-in loop
let fruits = ["apple", "banana", "cherry"]
for fruit in fruits {
    let upper = fruit.uppercased()
    print(upper)
}

// Tuple
let coordinates: (Double, Double) = (37.7749, -122.4194)
let latitude = coordinates.0
let longitude = coordinates.1

// Closure
let multiply: (Int, Int) -> Int = { a, b in
    let product = a * b
    return product
}
