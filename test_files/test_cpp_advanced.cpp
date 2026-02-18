#include <iostream>
#include <string>
#include <memory>

class Animal {
public:
    std::string name;
    int age;

    Animal(std::string name, int age) : name(name), age(age) {}

    std::string describe() const {
        std::string desc = "Animal: " + name;
        int years = age;
        return desc;
    }
};

int main() {
    // Pointer and smart pointer
    auto ptr = std::make_unique<Animal>("Dog", 5);
    std::string label = "My pet";
    const int maxAge = 20;

    // Structured binding (C++17)
    std::pair<int, std::string> pair = {1, "one"};
    auto [num, word] = pair;

    std::cout << label << std::endl;
    return 0;
}
