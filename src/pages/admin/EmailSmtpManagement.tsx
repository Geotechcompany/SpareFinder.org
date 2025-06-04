import AdminSidebar from '@/components/AdminSidebar';
import { Mail, Server, Lock, TestTube2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const EmailSmtpManagement = () => {
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.example.com',
    port: 587,
    username: 'admin@example.com',
    encryption: 'TLS'
  });

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6" /> Email SMTP Configuration
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">SMTP Server Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300">SMTP Host</label>
                  <Input 
                    value={smtpConfig.host}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">SMTP Port</label>
                  <Input
                    type="number"
                    value={smtpConfig.port}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Username</label>
                  <Input
                    value={smtpConfig.username}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" className="bg-red-600/20 hover:bg-red-600/30">
                    <TestTube2 className="w-4 h-4 mr-2" /> Test Connection
                  </Button>
                  <Button>Save Changes</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSmtpManagement; 