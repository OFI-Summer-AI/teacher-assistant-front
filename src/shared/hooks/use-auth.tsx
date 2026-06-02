import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  clearTokens,
  setTokens,
  teacherAssistantApi,
} from "@/modules/teacher-assistant/api/teacherAssistantApi";
import { User } from "@/modules/teacher-assistant/types";

type LoginResult = {
  success: boolean;
  error?: string;
};

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  reloadProfile: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const redirectByRole = (role: User["role"]) => {
    navigate(role === "director" ? "/director/dashboard" : "/teacher/dashboard");
  };

  const reloadProfile = async () => {
    const profile = await teacherAssistantApi.getProfile();
    setUser(profile);
    localStorage.setItem("ta_user", JSON.stringify(profile));
  };

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("ta_user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as User);
        } catch {
          localStorage.removeItem("ta_user");
        }
      }

      try {
        await reloadProfile();
      } catch {
        clearTokens();
        localStorage.removeItem("ta_user");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);

    try {
      const tokens = await teacherAssistantApi.login(username, password);
      if (!tokens.access || !tokens.refresh) {
        return {
          success: false,
          error: "Respuesta de autenticación inválida.",
        };
      }

      setTokens(tokens.access, tokens.refresh);
      const profile = await teacherAssistantApi.getProfile();

      setUser(profile);
      localStorage.setItem("ta_user", JSON.stringify(profile));
      redirectByRole(profile.role);

      return { success: true };
    } catch (error) {
      if (error instanceof teacherAssistantApi.ApiHttpError) {
        if (error.status === 401) {
          return {
            success: false,
            error: "Credenciales incorrectas. Inténtalo de nuevo.",
          };
        }

        return {
          success: false,
          error: `Error del servidor (${error.status}). Verifica la API.`,
        };
      }

      return {
        success: false,
        error: "No se pudo conectar con el backend. Revisa VITE_API_BASE_URL.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    clearTokens();
    localStorage.removeItem("ta_user");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, reloadProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}