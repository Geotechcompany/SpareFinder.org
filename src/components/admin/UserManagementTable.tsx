import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Search,
  UserPlus,
  Shield,
  User,
  Mail,
  Calendar,
  Activity,
  Ban,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import supabase, { db } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface UserProfile {
  id: string
  email: string
  username?: string
  full_name?: string
  avatar_url?: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
  last_sign_in?: string
  search_count?: number
  is_active?: boolean
}

interface UserManagementTableProps {
  onUserSelect?: (user: UserProfile) => void
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})

  const { user: currentUser } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Fetch user profiles with additional stats
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          part_searches(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process the data to include search counts
      const processedUsers = profiles?.map(profile => ({
        ...profile,
        search_count: profile.part_searches?.[0]?.count || 0,
        is_active: true, // This would come from auth.users table in real implementation
      })) || []

      setUsers(processedUsers)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setEditForm({
      full_name: user.full_name,
      username: user.username,
      role: user.role,
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    try {
      const { error } = await db.profiles.update(selectedUser.id, editForm)
      
      if (error) throw error

      toast.success('User updated successfully')
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  const handleToggleUserRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    
    try {
      const { error } = await db.profiles.update(user.id, { role: newRole })
      
      if (error) throw error

      toast.success(`User role updated to ${newRole}`)
      fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  const handleViewUserDetails = (user: UserProfile) => {
    if (onUserSelect) {
      onUserSelect(user)
    }
  }

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'Name', 'Username', 'Role', 'Searches', 'Created', 'Last Sign In'].join(','),
      ...filteredUsers.map(user => [
        user.email,
        user.full_name || '',
        user.username || '',
        user.role,
        user.search_count || 0,
        format(new Date(user.created_at), 'yyyy-MM-dd'),
        user.last_sign_in ? format(new Date(user.last_sign_in), 'yyyy-MM-dd') : 'Never'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getUserStatusBadge = (user: UserProfile) => {
    if (user.is_active) {
      return <Badge variant="default" className="bg-green-600/20 text-green-300 border-green-500/30">Active</Badge>
    }
    return <Badge variant="destructive" className="bg-red-600/20 text-red-300 border-red-500/30">Inactive</Badge>
  }

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    }
    return <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
      <User className="w-3 h-3 mr-1" />
      User
    </Badge>
  }

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border-white/10">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card className="bg-black/20 backdrop-blur-xl border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                User Management
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage users, roles, and permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={exportUsers}
                variant="outline" 
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={fetchUsers}
                variant="outline" 
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users by email, name, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-lg border border-white/10 bg-white/5">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Searches</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Last Active</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                              {user.full_name?.charAt(0) || user.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white">
                              {user.full_name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                            {user.username && (
                              <div className="text-xs text-gray-500">@{user.username}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getUserStatusBadge(user)}</TableCell>
                      <TableCell>
                        <div className="text-white font-medium">{user.search_count || 0}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{format(new Date(user.created_at), 'MMM dd, yyyy')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">
                          {user.last_sign_in ? format(new Date(user.last_sign_in), 'MMM dd, yyyy') : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-900/95 backdrop-blur-xl border-white/10" align="end">
                            <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => handleViewUserDetails(user)}
                              className="text-gray-300 hover:text-white cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEditUser(user)}
                              className="text-gray-300 hover:text-white cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleUserRole(user)}
                              className="text-gray-300 hover:text-white cursor-pointer"
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-400 hover:text-red-300 cursor-pointer"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No users found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name || ''}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editForm.username || ''}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={editForm.role} onValueChange={(value: 'user' | 'admin') => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete User</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-medium">Warning</p>
                <p className="text-red-400 text-sm">
                  You are about to delete <strong>{selectedUser?.email}</strong>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              // Implementation would go here
              toast.error('User deletion not implemented yet')
              setIsDeleteDialogOpen(false)
            }}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManagementTable 