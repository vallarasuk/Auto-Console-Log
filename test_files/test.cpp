#include <iostream>
#include <string>
#include <vector>

int add(int a, int b) {
    int result = a + b;
    return result;
}

int main() {
    int x = 10;
    auto y = 20;
    std::string message = "Hello";
    const double pi = 3.14159;

    std::vector<int> numbers = {1, 2, 3};
    int total = 0;

    for (int num : numbers) {
        total += num;
    }

    std::cout << message << std::endl;
    return 0;
}
