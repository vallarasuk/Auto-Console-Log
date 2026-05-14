import React from 'react';

function MyComponent({ name }) {
  return (
    <div>
      <h1>Hello {name}</h1>
      <button onClick={() => {
        const msg = "clicked";
        console.log(msg);
      }}>
        Click me
      </button>
    </div>
  );
}

const App = () => {
  const [data, setData] = React.useState(null);
  
  return (
    <div className="app">
      {data && (
        <ul>
          {data.map(item => {
            const id = item.id;
            return <li key={id}>{item.text}</li>;
          })}
        </ul>
      )}
    </div>
  );
};
