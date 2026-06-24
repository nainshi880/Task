import useLocalStorage from "../hooks/useLocalStorage";

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage("theme", "light");

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <div style={{ marginBottom: "30px" }}>
      <h2>Theme Toggle</h2>
      <p>Current Theme: {theme}</p>
      <button onClick={toggleTheme}>
        Switch to {theme === "light" ? "dark" : "light"} mode
      </button>
    </div>
  );
}

export default ThemeToggle;