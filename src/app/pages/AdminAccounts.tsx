import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, Database, Shield, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { deleteUser, getAllUsers, User } from '../services/database';

export function AdminAccounts() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allUsers = await getAllUsers();
      const sorted = [...allUsers].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setUsers(sorted);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load account details from local database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (user: User) => {
    const confirmed = confirm(`Delete account for ${user.email}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingUserId(user.id);
    setError(null);

    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete account. Please try again.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const totalUsers = users.length;
  const latestCreated = useMemo(() => {
    if (users.length === 0) return 'N/A';
    return new Date(users[0].createdAt).toLocaleString();
  }, [users]);

  return (
    <div className="p-8 space-y-6" style={{ backgroundColor: '#0F172A' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Admin: Accounts</h1>
          <p className="mt-2" style={{ color: '#9CA3AF' }}>
            View all created accounts stored in your local SyncFlow database.
          </p>
        </div>
        <Button
          onClick={loadUsers}
          disabled={isLoading}
          className="flex items-center gap-2"
          style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: '#9CA3AF' }}>Total Accounts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#22D3EE' }} />
            <span className="text-2xl font-bold" style={{ color: '#E5E7EB' }}>{totalUsers}</span>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: '#9CA3AF' }}>Latest Account Created</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#10B981' }} />
            <span className="text-sm" style={{ color: '#E5E7EB' }}>{latestCreated}</span>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: '#9CA3AF' }}>Storage</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Database className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <span className="text-sm" style={{ color: '#E5E7EB' }}>IndexedDB (SyncFlowDB/users)</span>
          </CardContent>
        </Card>
      </div>

      <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <CardTitle style={{ color: '#E5E7EB' }}>Created Account Details</CardTitle>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Password hashes are masked for safety. Use browser DevTools to inspect raw records if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#7F1D1D', border: '1px solid #EF4444', color: '#FECACA' }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <p style={{ color: '#9CA3AF' }}>Loading accounts...</p>
          ) : users.length === 0 ? (
            <p style={{ color: '#9CA3AF' }}>No accounts found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151', color: '#9CA3AF' }}>
                    <th className="text-left py-3 pr-4">Name</th>
                    <th className="text-left py-3 pr-4">Email</th>
                    <th className="text-left py-3 pr-4">User ID</th>
                    <th className="text-left py-3 pr-4">Password</th>
                    <th className="text-left py-3">Created At</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #273244' }}>
                      <td className="py-3 pr-4" style={{ color: '#E5E7EB' }}>{user.name}</td>
                      <td className="py-3 pr-4" style={{ color: '#E5E7EB' }}>{user.email}</td>
                      <td className="py-3 pr-4" style={{ color: '#9CA3AF' }}>{user.id}</td>
                      <td className="py-3 pr-4" style={{ color: '#9CA3AF' }}>******** (hashed)</td>
                      <td className="py-3" style={{ color: '#E5E7EB' }}>{new Date(user.createdAt).toLocaleString()}</td>
                      <td className="py-3">
                        <Button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                          className="flex items-center gap-2"
                          style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}