import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Camera, Save, Shield, Star, Calendar, Upload } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const Profile = () => {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    bio: 'Automotive parts specialist with 10+ years of experience',
    location: 'Detroit, MI',
    website: 'https://johndoe.com'
  });

  const stats = {
    totalUploads: 147,
    successRate: 96.5,
    memberSince: 'January 2023',
    reputation: 4.8
  };

  const achievements = [
    { name: 'First Upload', description: 'Completed your first part analysis', earned: true },
    { name: 'Power User', description: 'Uploaded 100+ parts', earned: true },
    { name: 'Accuracy Expert', description: 'Maintained 95%+ success rate', earned: true },
    { name: 'Community Helper', description: 'Helped 10+ users', earned: false },
  ];

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Profile saved:', profile);
  };

  const handleAvatarChange = () => {
    console.log('Change avatar clicked');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 px-4">
            <SidebarTrigger className="-ml-1 text-gray-300 hover:text-white hover:bg-gray-800" />
            <div className="ml-auto">
              <Button onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </header>

          <div className="flex-1 lg:ml-64 p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 lg:space-y-8 max-w-6xl"
            >
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                  <UserCircle className="w-8 h-8" />
                  <span>Profile</span>
                </h1>
                <p className="text-gray-400">Manage your public profile and preferences</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-2 space-y-6"
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">Profile Information</CardTitle>
                      <CardDescription className="text-gray-400">
                        Update your profile details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          <Avatar className="w-20 h-20">
                            <AvatarImage src="/placeholder.svg" alt="Profile" />
                            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl">
                              {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            size="sm"
                            onClick={handleAvatarChange}
                            className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-gray-700 hover:bg-gray-600"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{profile.firstName} {profile.lastName}</h3>
                          <p className="text-gray-400">{profile.email}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                              <Shield className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                            <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 border-yellow-500/30">
                              <Star className="w-3 h-3 mr-1" />
                              {stats.reputation} Rating
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-gray-200">First Name</Label>
                          <Input
                            id="firstName"
                            value={profile.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-gray-200">Last Name</Label>
                          <Input
                            id="lastName"
                            value={profile.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-200">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-gray-200">Bio</Label>
                        <Input
                          id="bio"
                          value={profile.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-gray-200">Location</Label>
                          <Input
                            id="location"
                            value={profile.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-gray-200">Website</Label>
                          <Input
                            id="website"
                            value={profile.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">Achievements</CardTitle>
                      <CardDescription className="text-gray-400">
                        Your progress and milestones
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {achievements.map((achievement, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              achievement.earned
                                ? 'bg-green-600/10 border-green-500/30 text-green-300'
                                : 'bg-gray-700/30 border-gray-600/50 text-gray-400'
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <Star className={`w-4 h-4 ${achievement.earned ? 'text-yellow-400' : 'text-gray-500'}`} />
                              <span className="font-medium">{achievement.name}</span>
                            </div>
                            <p className="text-sm">{achievement.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">Statistics</CardTitle>
                      <CardDescription className="text-gray-400">
                        Your activity overview
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <div className="flex items-center space-x-2">
                          <Upload className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-200">Total Uploads</span>
                        </div>
                        <span className="text-white font-semibold">{stats.totalUploads}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-gray-200">Success Rate</span>
                        </div>
                        <span className="text-white font-semibold">{stats.successRate}%</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-green-400" />
                          <span className="text-gray-200">Member Since</span>
                        </div>
                        <span className="text-white font-semibold">{stats.memberSince}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">Account Security</CardTitle>
                      <CardDescription className="text-gray-400">
                        Manage your account security
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="outline" className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                        Change Password
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                        Two-Factor Authentication
                      </Button>
                      <Button variant="outline" className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                        Download Data
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Profile;
