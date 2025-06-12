import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Building,
  MapPin,
  Calendar,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Sparkles,
  Award,
  Zap,
  Activity,
  Edit,
  Camera
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Profile = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const userStats = {
    totalUploads: 847,
    successRate: 96.8,
    avgConfidence: 94.2,
    memberSince: 'January 2023',
    streak: 15,
    totalSaved: '$2,340',
    achievements: 12
  };

  const achievements = [
    { id: 1, title: 'First Upload', description: 'Uploaded your first part', icon: Trophy, color: 'from-yellow-600 to-orange-600', earned: true },
    { id: 2, title: 'Speed Demon', description: 'Identified 100 parts in a day', icon: Zap, color: 'from-blue-600 to-cyan-600', earned: true },
    { id: 3, title: 'Accuracy Expert', description: 'Achieved 95% accuracy rate', icon: Target, color: 'from-green-600 to-emerald-600', earned: true },
    { id: 4, title: 'Part Master', description: 'Identified 1000+ parts', icon: Award, color: 'from-purple-600 to-pink-600', earned: false },
    { id: 5, title: 'Streak Master', description: '30-day identification streak', icon: Activity, color: 'from-red-600 to-orange-600', earned: false },
    { id: 6, title: 'Explorer', description: 'Used all part categories', icon: TrendingUp, color: 'from-indigo-600 to-purple-600', earned: true }
  ];

  const recentActivity = [
    { id: 1, action: 'Identified Brake Pad Set', confidence: 98.2, time: '2 hours ago', category: 'Braking System' },
    { id: 2, action: 'Uploaded Air Filter', confidence: 94.5, time: '1 day ago', category: 'Engine' },
    { id: 3, action: 'Found Spark Plug Match', confidence: 96.8, time: '2 days ago', category: 'Ignition' },
    { id: 4, action: 'Analyzed Oil Filter', confidence: 92.1, time: '3 days ago', category: 'Engine' }
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
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

      <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />

      {/* Main Content */}
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
          className="space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-900"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                  <div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-2"
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" />
                      </motion.div>
                      <span className="text-purple-300 text-xs font-semibold">Pro Member</span>
                    </motion.div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                      John Doe
                    </h1>
                    <p className="text-gray-400 text-lg mt-1">Senior Parts Analyst at Auto Parts Inc.</p>
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Member since {userStats.memberSince}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{userStats.streak} day streak</span>
                      </div>
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { 
                title: 'Total Uploads', 
                value: userStats.totalUploads.toLocaleString(), 
                icon: TrendingUp, 
                color: 'from-purple-600 to-blue-600',
                change: '+15%'
              },
              { 
                title: 'Success Rate', 
                value: `${userStats.successRate}%`, 
                icon: Target, 
                color: 'from-green-600 to-emerald-600',
                change: '+2.1%'
              },
              { 
                title: 'Avg Confidence', 
                value: `${userStats.avgConfidence}%`, 
                icon: Trophy, 
                color: 'from-blue-600 to-cyan-600',
                change: '+1.8%'
              },
              { 
                title: 'Total Saved', 
                value: userStats.totalSaved, 
                icon: Zap, 
                color: 'from-orange-600 to-red-600',
                change: '+$340'
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`} />
                <Card className="relative bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                        <p className={`text-sm mt-1 ${
                          stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stat.change} this month
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <span>Achievements</span>
                    <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30">
                      {achievements.filter(a => a.earned).length}/{achievements.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your milestones and accomplishments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className={`p-4 rounded-xl border transition-all duration-300 ${
                          achievement.earned 
                            ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                            : 'bg-gray-500/5 border-gray-500/10 opacity-50'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            achievement.earned 
                              ? `bg-gradient-to-r ${achievement.color}` 
                              : 'bg-gray-600/30'
                          }`}>
                            <achievement.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{achievement.title}</h4>
                            <p className="text-gray-400 text-sm">{achievement.description}</p>
                          </div>
                          {achievement.earned && (
                            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your latest part identification activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{activity.action}</h4>
                          <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-500/30 text-xs">
                            {activity.confidence}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{activity.category}</span>
                          <span className="text-gray-500">{activity.time}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <User className="w-5 h-5 text-purple-400" />
                  <span>Contact Information</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your profile and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-white/10">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Email</p>
                        <p className="text-white">john.doe@example.com</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-white/10">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Phone</p>
                        <p className="text-white">+1 (555) 123-4567</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl flex items-center justify-center border border-white/10">
                        <Building className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Company</p>
                        <p className="text-white">Auto Parts Inc.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl flex items-center justify-center border border-white/10">
                        <MapPin className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Location</p>
                        <p className="text-white">New York, NY</p>
                      </div>
                    </div>
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

export default Profile;
