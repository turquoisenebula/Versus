import { createContext, useEffect, useRef, useState } from "react";
import { getMe, login as loginRequest, register as registerRequest } from "../api/auth.api";
import { AUTH_TOKEN_KEY } from "../api/axios";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    window.localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY)),
  );
  const authVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const version = authVersion.current;

    if (!token) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getMe()
      .then(({ user: restoredUser }) => {
        if (active && authVersion.current === version) {
          setUser(restoredUser);
        }
      })
      .catch(() => {
        if (active && authVersion.current === version) {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active && authVersion.current === version) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleAuthLogout() {
      authVersion.current += 1;
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setLoading(false);
    }

    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

  async function authenticate(request, credentials) {
    const { user: authenticatedUser, token: authToken } =
      await request(credentials);

    window.localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    setToken(authToken);
    setUser(authenticatedUser);
  }

  async function login(credentials) {
    await authenticate(loginRequest, credentials);
  }

  async function register(credentials) {
    await authenticate(registerRequest, credentials);
  }

  function logout() {
    authVersion.current += 1;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }

  function updateUser(updatedUser) {
    setUser((currentUser) =>
      currentUser ? { ...currentUser, ...updatedUser } : currentUser,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
