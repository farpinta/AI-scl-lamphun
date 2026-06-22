import LoginForm from '../components/LoginForm';

interface LoginPageProps {
    onLoginSuccess: (userId: number) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    return (
        <LoginForm onLoginSuccess={onLoginSuccess} />
    );
}
