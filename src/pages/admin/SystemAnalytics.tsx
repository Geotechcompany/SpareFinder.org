import AdminSidebar from '@/components/AdminSidebar';
import { BarChart3, Activity, Server, Database, Cpu } from 'lucide-react';

const SystemAnalytics = () => {
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-8">
          <BarChart3 className="w-6 h-6" /> System Analytics
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-8 h-8 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Performance Metrics</h2>
            </div>
            {/* Add charts here */}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-8 h-8 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Server Health</h2>
            </div>
            {/* Server stats */}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Database Status</h2>
            </div>
            {/* DB metrics */}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Cpu className="w-8 h-8 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">System Resources</h2>
            </div>
            {/* Resource usage */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics; 