import { useMemo, useState } from "react";
import useFetch from "../hooks/useFetch";
import useDebounce from "../hooks/useDebounce";

function SearchUsers() {
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 500);

  const { data: users, loading, error } = useFetch(
    "https://jsonplaceholder.typicode.com/users"
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [users, debouncedSearch]);

  return (
    <div style={{ marginBottom: "30px" }}>
      <h2>Search Users</h2>

      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "8px", width: "250px" }}
      />

      <p>
        <strong>Debounced Search Value:</strong> {debouncedSearch}
      </p>

      {loading && <p>Loading users...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <ul>
          {filteredUsers.map((user) => (
            <li key={user.id}>
              {user.name} - {user.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchUsers;