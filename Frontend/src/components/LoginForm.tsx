import { useState } from 'react';
import styles from '../styles/Form.module.css';

interface LoginFormProps {
    onLoginSuccess?: (userId: number) => void;
}

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: number;
        username: string;
    }
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/v2/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier, password }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'เข้าสู่ระบบไม่สำเร็จ');
            }

            const data: LoginResponse = await response.json();
            
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

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
        <div className={styles.container}>
            <div className={styles.imageSection}></div>

            <div className={styles.formSection}>
                <h2 className={styles.title}>Login</h2>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <input
                            type="text"
                            className={styles.input}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Username"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.button}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Checking...' : 'LOGIN'}
                    </button>
                </form>
            </div>
        </div>
    );
}