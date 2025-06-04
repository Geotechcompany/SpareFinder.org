import { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { BrainCircuit, Plus, Key, Cpu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const AIModelsManagement = () => {
  const [models, setModels] = useState([
    { id: 1, provider: 'OpenAI', model: 'GPT-4', apiKey: 'sk-••••••••', status: 'active' },
    { id: 2, provider: 'Anthropic', model: 'Claude-2', apiKey: 'sk-••••••••', status: 'inactive' },
  ]);

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminSidebar />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6" /> AI Models Management
          </h1>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Add Model
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {models.map(model => (
            <div key={model.id} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">{model.provider}</h2>
                </div>
                <span className={`px-2 py-1 text-sm rounded ${
                  model.status === 'active' ? 
                  'bg-green-600/20 text-green-300' : 
                  'bg-gray-600/20 text-gray-300'
                }`}>
                  {model.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Model Name</label>
                  <Input 
                    value={model.model}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">API Key</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="password"
                      value={model.apiKey}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4 mr-2" /> Rotate Key
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIModelsManagement; 