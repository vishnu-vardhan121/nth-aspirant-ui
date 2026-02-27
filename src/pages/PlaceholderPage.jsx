import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PlaceholderPage({ title, message = 'Coming soon.' }) {
  return (
    <div
      className="min-h-screen flex flex-col px-6"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <Navbar variant="app" />
      <div className="flex flex-col items-center justify-center flex-1 pt-16">
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-slate-400 mb-6">{message}</p>
        <Link
          to="/"
          className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{
            color: 'hsl(var(--nth-primary-light))',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
