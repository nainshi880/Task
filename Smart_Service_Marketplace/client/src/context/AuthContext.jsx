import {
  createContext,
  useEffect,
  useState,
} from "react";

export const AuthContext = createContext();

export function AuthProvider({
  children,
}) {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const initialize = async () => {

      try {

        if (token) {

          setUser({
            token,
          });

        }

      } finally {

        setLoading(false);

      }

    };

    initialize();

  }, [token]);

  const login = (
    userData,
    jwtToken
  ) => {

    localStorage.setItem(
      "token",
      jwtToken
    );

    setUser(userData);

    setToken(jwtToken);

  };

  const logout = () => {

    localStorage.removeItem("token");

    setUser(null);

    setToken(null); 

  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
