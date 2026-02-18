// TypeScript generics and advanced patterns
type ApiResponse<T> = {
    data: T;
    status: number;
};

async function fetchItems<T>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url);
    const data: T = await response.json();
    const result: ApiResponse<T> = { data, status: 200 };
    return result;
}

// Enum
enum Direction {
    Up = "UP",
    Down = "DOWN",
}

const direction: Direction = Direction.Up;

// Optional chaining & nullish coalescing
const config = { timeout: 5000 };
const timeout = config?.timeout ?? 3000;

// Type assertion
const rawValue: unknown = "hello";
const strValue = rawValue as string;
