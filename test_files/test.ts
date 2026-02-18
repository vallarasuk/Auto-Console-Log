// TypeScript basic test
interface User {
    id: number;
    name: string;
}

const userId: number = 42;
const userName: string = "Alice";
const isActive: boolean = true;

function getUser(id: number): User {
    const user: User = { id, name: "Alice" };
    const label: string = `User #${id}`;
    return user;
}

const greetUser = (user: User): string => {
    const greeting: string = `Hello, ${user.name}`;
    return greeting;
};

class UserService {
    private baseUrl: string;

    constructor(url: string) {
        this.baseUrl = url;
        const config = { url };
    }

    async fetchUser(id: number): Promise<User> {
        const endpoint = `${this.baseUrl}/users/${id}`;
        const result: User = { id, name: "test" };
        return result;
    }
}

// Destructuring
const { id, name } = { id: 1, name: "Bob" };
const [first, second] = [10, 20];
const { a: aliasA, b: aliasB } = { a: 1, b: 2 };
const { x, ...rest } = { x: 1, y: 2, z: 3 };
