var greeting = "Hello, World!"
let count = 42
var score: Double = 95.5
let name: String = "Alice"

func greet(user: String, times: Int) -> String {
    let message = "Hello, \(user)!"
    var repeated = ""
    return message
}

class Person {
    var firstName: String
    var lastName: String

    init(firstName: String, lastName: String) {
        self.firstName = firstName
        self.lastName = lastName
        let fullName = "\(firstName) \(lastName)"
    }

    func describe() -> String {
        let description = "\(firstName) \(lastName)"
        return description
    }
}
