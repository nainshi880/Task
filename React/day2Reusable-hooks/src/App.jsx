import SearchUsers from "./components/SearchUsers";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Week 2 - Day 2: Reusable Custom Hooks</h1>

      <ThemeToggle />
      <hr />
      <SearchUsers />
    </div>
  );
}

export default App;