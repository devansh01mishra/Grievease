import { useState } from 'react';
import LandingPage from './LandingPage.jsx';
import LoginPage from './LoginPage.jsx';

export default function App() {
  const [page, setPage] = useState('landing');
  const openLogin = () => { setPage('login'); window.scrollTo({ top: 0, behavior: 'auto' }); };
  const openHome = () => { setPage('landing'); window.scrollTo({ top: 0, behavior: 'auto' }); };
  return page === 'login'
    ? <LoginPage onBackHome={openHome} />
    : <LandingPage onLogin={openLogin} />;
}
