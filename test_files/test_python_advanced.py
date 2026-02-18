import os

# For loop variable
numbers = [1, 2, 3, 4, 5]
for num in numbers:
    squared = num ** 2

# With statement
with open("test.py", "r") as file_handle:
    content = file_handle.read()

# *args and **kwargs
def process(*args, **kwargs):
    total = sum(args)
    label = kwargs.get("label", "result")
    return total

# Tuple unpacking
first, second, third = (10, 20, 30)

# Nested function
def outer(value):
    multiplier = 2
    def inner(x):
        result = x * multiplier
        return result
    return inner(value)
