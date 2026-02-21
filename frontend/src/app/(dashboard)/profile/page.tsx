'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg('');
    setEmailLoading(true);
    try {
      await api.put('/auth/profile', { email });
      setEmailMsg('Email updated successfully.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update email';
      setEmailMsg(msg);
    }
    setEmailLoading(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg('');
    if (newPassword !== confirmPassword) {
      setPwMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg('Password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPwMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password';
      setPwMsg(msg);
    }
    setPwLoading(false);
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#DAA520]';

  return (
    <div className="space-y-8 max-w-lg">
      <h2 className="text-sm font-medium text-[#DAA520]">ACCOUNT SETTINGS</h2>

      {/* Email */}
      <form onSubmit={handleEmailUpdate} className="pb-8 border-b border-gray-800 space-y-4">
        <h3 className="text-sm font-medium text-[#DAA520]">EMAIL ADDRESS</h3>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={inputClass}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={emailLoading}
            className="px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {emailLoading ? 'Updating...' : 'Update Email'}
          </button>
          {emailMsg && <span className="text-sm text-gray-400">{emailMsg}</span>}
        </div>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordChange} className="pb-8 border-b border-gray-800 space-y-4">
        <h3 className="text-sm font-medium text-[#DAA520]">CHANGE PASSWORD</h3>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Current Password</label>
          <input
            type="password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Confirm New Password</label>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pwLoading}
            className="px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
          {pwMsg && <span className="text-sm text-gray-400">{pwMsg}</span>}
        </div>
      </form>

      {/* Subscription placeholder */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-red-400">SUBSCRIPTION</h3>
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
          <p className="text-sm text-red-400/70">Subscription management coming soon.</p>
        </div>
      </div>
    </div>
  );
}
