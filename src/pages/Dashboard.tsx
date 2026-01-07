
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Import Role-Based Dashboards
import { AdminDashboard } from './dashboard/AdminDashboard';
import { ParticipantDashboard } from './dashboard/ParticipantDashboard';

const Dashboard: React.FC = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
      if (!loading && !user) {
          navigate('/login');
      }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-400 font-medium animate-pulse">Menyiapkan Dashboard...</p>
      </div>
    );
  }

  if (!user) return null;

  // Render Dashboard Based on Role
  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return <ParticipantDashboard />;
};

export default Dashboard;
