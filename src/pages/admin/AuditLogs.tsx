import AdminSidebar from '@/components/AdminSidebar';
import { History, User, Shield, Clock, Search } from 'lucide-react';

const AuditLogs = () => {
  const logs = [
    { id: 1, user: 'admin', action: 'Modified user permissions', timestamp: '2024-01-15 14:30' },
    { id: 2, user: 'john', action: 'Uploaded new part', timestamp: '2024-01-15 14:15' },
    { id: 3, user: 'system', action: 'Performed nightly backup', timestamp: '2024-01-15 03:00' },
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6" /> Audit Logs
          </h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">Timestamp</th>
                  <th className="px-4 py-3 text-left text-gray-300">User</th>
                  <th className="px-4 py-3 text-left text-gray-300">Action</th>
                  <th className="px-4 py-3 text-left text-gray-300">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="px-4 py-3 text-gray-300 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {log.timestamp}
                    </td>
                    <td className="px-4 py-3 text-white">
                      <User className="inline-block w-4 h-4 mr-2" /> {log.user}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{log.action}</td>
                    <td className="px-4 py-3">
                      <button className="text-red-400 hover:text-red-300">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs; 