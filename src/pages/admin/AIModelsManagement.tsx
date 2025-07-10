import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { 
  BrainCircuit, 
  Plus, 
  Key, 
  Cpu,
  Zap,
  Settings,
  TestTube2,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Bot,
  Shield,
  Globe,
  BarChart3,
  Loader2
} from 'lucide-react';

interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  api_key: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  usage_count: number;
  cost: number;
  avg_response_time: number;
  success_rate: number;
  last_used_at?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const AIModelsManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    fetchAIModels();
  }, []);

  const fetchAIModels = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.admin.getAIModels();
      
      if (response.success && response.data?.models) {
        setModels(response.data.models);
      } else {
        throw new Error('Failed to fetch AI models');
      }
    } catch (err) {
      console.error('Error fetching AI models:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI models');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load AI models. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const modelStats = {
    totalUsage: models.reduce((sum, model) => sum + model.usage_count, 0),
    totalCost: models.reduce((sum, model) => sum + model.cost, 0),
    avgResponseTime: models.length > 0 ? models.reduce((sum, model) => sum + model.avg_response_time, 0) / models.length : 0,
    avgSuccessRate: models.length > 0 ? models.reduce((sum, model) => sum + model.success_rate, 0) / models.length : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'inactive':
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-red-600/20 text-red-300 border-red-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const availableProviders = [
    { name: 'OpenAI', models: ['GPT-4 Turbo', 'GPT-4', 'GPT-3.5 Turbo'], icon: '🤖' },
    { name: 'Anthropic', models: ['Claude-3 Opus', 'Claude-3 Sonnet', 'Claude-3 Haiku'], icon: '🧠' },
    { name: 'Google', models: ['Gemini Pro', 'Gemini Ultra', 'PaLM 2'], icon: '🎯' },
    { name: 'Cohere', models: ['Command', 'Command Light', 'Embed'], icon: '⚡' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading AI models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchAIModels} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-red-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <AdminDesktopSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
      
      <motion.div
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-rose-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full border border-red-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <BrainCircuit className="w-4 h-4 text-red-400" />
                    </motion.div>
                    <span className="text-red-300 text-sm font-semibold">AI Models</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-red-100 to-rose-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    AI Models Management
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Configure and monitor AI model integrations
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/25 h-12 px-6">
                      <Plus className="w-4 h-4 mr-2" />
                      Add AI Model
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* AI Model Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { 
                label: 'Total Requests', 
                value: modelStats.totalUsage.toLocaleString(), 
                icon: Activity, 
                color: 'from-blue-600 to-cyan-600' 
              },
              { 
                label: 'Total Cost', 
                value: `£${modelStats.totalCost.toFixed(2)}`, 
                icon: DollarSign, 
                color: 'from-green-600 to-emerald-600' 
              },
              { 
                label: 'Avg Response Time', 
                value: `${modelStats.avgResponseTime.toFixed(1)}s`, 
                icon: Clock, 
                color: 'from-purple-600 to-violet-600' 
              },
              { 
                label: 'Success Rate', 
                value: `${modelStats.avgSuccessRate.toFixed(1)}%`, 
                icon: TrendingUp, 
                color: 'from-orange-600 to-red-600' 
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* AI Models Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {models.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-${model.provider === 'OpenAI' ? 'green' : model.provider === 'Anthropic' ? 'orange' : 'blue'}-600/10 to-${model.provider === 'OpenAI' ? 'emerald' : model.provider === 'Anthropic' ? 'red' : 'indigo'}-600/10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-${model.provider === 'OpenAI' ? 'green' : model.provider === 'Anthropic' ? 'orange' : 'blue'}-600 to-${model.provider === 'OpenAI' ? 'emerald' : model.provider === 'Anthropic' ? 'red' : 'indigo'}-600 flex items-center justify-center text-2xl`}>
                          {model.provider === 'OpenAI' ? '🤖' : model.provider === 'Anthropic' ? '🧠' : '🎯'}
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{model.provider}</CardTitle>
                          <CardDescription className="text-gray-400 text-sm">
                            {model.model_name}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(model.status)} font-medium`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(model.status)}
                          <span className="capitalize">{model.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Description */}
                    <p className="text-gray-300 text-sm">{model.description}</p>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-white/5">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{model.usage_count.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs">Requests</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">£{model.cost.toFixed(0)}</div>
                        <div className="text-gray-400 text-xs">Cost</div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Response Time</span>
                        <span className="text-white font-medium">{model.avg_response_time}s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Success Rate</span>
                        <span className="text-green-400 font-medium">{model.success_rate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Last Used</span>
                        <span className="text-gray-400 text-sm">
                          {model.last_used_at ? new Date(model.last_used_at).toLocaleString() : 'Never'}
                        </span>
                      </div>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                      <Label className="text-gray-200 text-sm">API Key</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type={showApiKeys[model.id] ? 'text' : 'password'}
                          value={model.api_key}
                          readOnly
                          className="h-10 bg-white/5 border-white/10 text-white text-sm font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(model.id)}
                          className="h-10 w-10 p-0 border-white/10 hover:bg-white/10"
                        >
                          {showApiKeys[model.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4 text-blue-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <TestTube2 className="w-4 h-4 text-green-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <BarChart3 className="w-4 h-4 text-purple-400" />
                        </motion.button>
                      </div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={model.status === 'active' ? 'outline' : 'default'}
                          size="sm"
                          className={
                            model.status === 'active'
                              ? 'border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/10'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }
                        >
                          {model.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Add New Model */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span>Add New AI Model</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure a new AI model for the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="provider" className="text-gray-200 font-medium">Provider</Label>
                    <Select>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map(provider => (
                          <SelectItem key={provider.name} value={provider.name}>
                            <div className="flex items-center space-x-2">
                              <span>{provider.icon}</span>
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-gray-200 font-medium">Model</Label>
                    <Select>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4 Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude-3 Opus</SelectItem>
                        <SelectItem value="gemini">Gemini Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apikey" className="text-gray-200 font-medium">API Key</Label>
                    <Input
                      id="apikey"
                      type="password"
                      placeholder="Enter API key"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="flex items-end">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full"
                    >
                      <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 rounded-xl">
                        <Shield className="w-4 h-4 mr-2" />
                        Add Model
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AIModelsManagement; 