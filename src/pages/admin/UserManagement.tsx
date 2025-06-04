import AdminSidebar from '@/components/AdminSidebar';
import { Users, Shield, Search, Edit, Trash, Plus } from 'lucide-react';

const UserManagement = () => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', role: 'user', status: 'active' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'user', status: 'suspended' },
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" /> User Management
          </h1>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Add User
          </button>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <div className="mb-4 flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-gray-300">Role</th>
                  <th className="px-4 py-3 text-left text-gray-300">Status</th>
                  <th className="px-4 py-3 text-right text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="px-4 py-3 text-white">{user.name}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-sm">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.status === 'active' 
                          ? 'bg-green-600/20 text-green-300' 
                          : 'bg-yellow-600/20 text-yellow-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-gray-600/30 rounded">
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-600/30 rounded">
                          <Trash className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
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

export default UserManagement; 