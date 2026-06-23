import { useCallback, useMemo, useState } from "react";
import Child from "./components/Child";
import OptimizedChild from "./components/OptimizedChild";

function App() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("light");
  const [text, setText] = useState("");

  console.log("Parent rendered");

  // Normal function -> recreated on every render
  const handleNormalClick = () => {
    console.log("Normal child clicked");
  };

  // Memoized function -> same reference across renders
  const handleOptimizedClick = useCallback(() => {
    console.log("Optimized child clicked");
  }, []);

  // Expensive calculation
  const expensiveValue = useMemo(() => {
    console.log("Expensive calculation running...");
    let total = 0;

    for (let i = 0; i < 100000000; i++) {
      total += i;
    }

    return total + count;
  }, [count]);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Week 2 - Day 1: Optimize Rendering Performance</h1>

      <h2>Counter: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Increment Counter</button>

      <br /><br />

      <h2>Theme: {theme}</h2>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Toggle Theme
      </button>

      <br /><br />

      <input
        type="text"
        placeholder="Type here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <p>Input Value: {text}</p>

      <hr />

      <h2>Without Optimization</h2>
      <Child name="Nainshi" onClick={handleNormalClick} />

      <hr />

      <h2>With Optimization</h2>
      <OptimizedChild name="Nainshi" onClick={handleOptimizedClick} />

      <hr />

      <h2>Expensive Calculation Result</h2>
      <p>{expensiveValue}</p>
    </div>
  );
}

export default App;