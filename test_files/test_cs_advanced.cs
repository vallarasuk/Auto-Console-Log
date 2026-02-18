using System;
using System.Collections.Generic;

class TestAdvanced {
    static void Main() {
        var items = new List<string>();
        string message = "Hello";
        int count = items.Count;

        foreach (string item in items) {
            Console.WriteLine(item);
        }

        // Nullable
        int? nullable = null;
        string? optionalName = "Alice";

        // var inference
        var result = string.Join(", ", items);
    }

    static string Process(string input, int maxLength) {
        string trimmed = input.Trim();
        int actualLength = Math.Min(input.Length, maxLength);
        string output = trimmed.Substring(0, actualLength);
        return output;
    }
}
