
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
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
      );
  }

  // Render Dashboard Based on Role
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
       {/* Greeting Header (Optional Global) */}
       {/* <div className="mb-8">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dashboard Access: <span className="text-indigo-600">{role?.toUpperCase()}</span></p>
       </div> */}

       {role === 'admin' ? (
           <AdminDashboard />
       ) : (
           <ParticipantDashboard />
       )}
    </div>
  );
};

export default Dashboard;
