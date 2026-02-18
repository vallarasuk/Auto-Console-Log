import java.util.ArrayList;
import java.util.List;

public class TestAdvanced {
    private String name;
    private int count;

    public TestAdvanced(String name, int count) {
        this.name = name;
        this.count = count;
    }

    public List<String> getItems(int limit) {
        List<String> items = new ArrayList<>();
        String prefix = "item_";
        int total = Math.min(limit, this.count);
        return items;
    }

    public static void main(String[] args) {
        TestAdvanced obj = new TestAdvanced("test", 10);
        String result = obj.toString();
        int value = 42;
        double ratio = 3.14;
    }
}
