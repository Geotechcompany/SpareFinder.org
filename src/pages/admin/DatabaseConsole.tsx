import AdminSidebar from '@/components/AdminSidebar';
import { Database, Terminal, Play, History } from 'lucide-react';

const DatabaseConsole = () => {
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-8">
          <Database className="w-6 h-6" /> Database Console
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Query Editor</h2>
            </div>
            <textarea
              className="w-full h-48 bg-gray-700 text-white p-4 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="SELECT * FROM ..."
            />
            <button className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center">
              <Play className="w-4 h-4 mr-2" /> Execute Query
            </button>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <History className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Query History</h2>
            </div>
            {/* Query history list */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConsole; 