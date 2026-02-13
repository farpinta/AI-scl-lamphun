import { useState, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom' // [เพิ่ม] ต้อง Import ตัวนี้
import Navbar from './components/Navbar'         // [เพิ่ม] เรียกใช้ Navbar ที่ทำไว้
import LoginPage from './pages/LoginPage.tsx';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null); 
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/v2/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
         const userData = await res.json();
         setUserId(userData.id);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error(error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLoginSuccess = (id: number) => {
     setUserId(id);
    setIsLoggedIn(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter> 
    
      {!isLoggedIn ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Navbar />
      )}
    </BrowserRouter>
  );
}

export default App;