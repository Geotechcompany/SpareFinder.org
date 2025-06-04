import AdminSidebar from '@/components/AdminSidebar';
import { Settings, Shield, Lock, Mail, Bell } from 'lucide-react';

const SystemSettings = () => {
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-8">
          <Settings className="w-6 h-6" /> System Settings
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-semibold text-white">Security Settings</h2>
            </div>
            {/* Security form */}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Authentication</h2>
            </div>
            {/* Auth settings */}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Email Configuration</h2>
            </div>
            {/* Email settings */}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
            </div>
            {/* Notification settings */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings; 