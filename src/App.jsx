import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import PricingPage from './pages/pricing/PricingPage';
import PlaceholderPage from './pages/PlaceholderPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<PlaceholderPage title="Login" message="Sign in — coming soon." />} />
        <Route path="/home" element={<PlaceholderPage title="User Home" message="Your dashboard — coming soon." />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
