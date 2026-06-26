import { useState } from "react";
import styles from "../styles/Form.module.css";

interface LoginFormProps {
  onLoginSuccess?: (userId: number) => void;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
  };
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v2/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "เข้าสู่ระบบไม่สำเร็จ");
      }

      const data: LoginResponse = await response.json();

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      if (onLoginSuccess) {
        onLoginSuccess(data.user.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.mainContent}>
        <div className={styles.brandPanel}>
          <div className={styles.brandContainer}>
            <div className={styles.brandLogo}>
              <img
                src="/logo.png"
                alt="Water Flow Logo"
                className={styles.brandLogoImg}
              />
            </div>
            <h1 className={styles.brandTitle}>Water Flow</h1>
          </div>
        </div>

        <div className={styles.signInPanel}>
          <div className={styles.formCard}>
            <h2 className={styles.signinTitle}>Sign in</h2>

            <form onSubmit={handleSubmit} className={styles.formContent}>
              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.fieldsContainer}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={styles.input}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email"
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="password"
                      className={styles.input}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.actionsContainer}>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={isLoading}
                >
                  {isLoading ? "Checking..." : "Sign in"}
                </button>
                <button type="button" className={styles.forgotPassword}>
                  Forgot your password?
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
