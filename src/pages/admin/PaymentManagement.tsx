import AdminSidebar from '@/components/AdminSidebar';
import { CreditCard, Plus, Wallet, Banknote, Edit, Trash } from 'lucide-react';

const PaymentManagement = () => {
  const paymentMethods = [
    { id: 1, name: 'Stripe', status: 'active', apiKey: 'sk_live_••••••••' },
    { id: 2, name: 'PayPal', status: 'inactive', apiKey: '' },
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6" /> Payment Methods
          </h1>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Add Method
          </button>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">Provider</th>
                  <th className="px-4 py-3 text-left text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-gray-300">API Key</th>
                  <th className="px-4 py-3 text-right text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods.map(method => (
                  <tr key={method.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="px-4 py-3 text-white flex items-center gap-2">
                      {method.name === 'Stripe' ? 
                        <Wallet className="w-5 h-5 text-purple-400" /> : 
                        <Banknote className="w-5 h-5 text-blue-400" />
                      }
                      {method.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        method.status === 'active' ? 
                        'bg-green-600/20 text-green-300' : 
                        'bg-gray-600/20 text-gray-300'
                      }`}>
                        {method.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                      {method.apiKey.slice(0, 8) + '••••••••'}
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

export default PaymentManagement; 