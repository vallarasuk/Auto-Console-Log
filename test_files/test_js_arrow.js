// Arrow function context test
const fetchData = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

const processItems = (items) => {
  const filtered = items.filter((x) => x > 0);
  const mapped = filtered.map((x) => x * 2);
  return mapped;
};

const obj = {
  method: function (input) {
    const processed = input.trim();
    return processed;
  },
  arrow: (value) => {
    const doubled = value * 2;
    return doubled;
  },
};
