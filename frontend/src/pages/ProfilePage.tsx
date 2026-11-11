import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { authApi, userApi } from '../lib/api';
import toast from 'react-hot-toast';
import { User, Save, Loader2, Building2, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    phone: '',
    bio: '',
  });
  const [clinic, setClinic] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const { data: profileData } = useQuery({
    queryKey: ['me-profile'],
    queryFn: () => authApi.me().then((r) => r.data),
  });

  useEffect(() => {
    const source = profileData || user;
    if (source) {
      setForm({
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        specialty: source.specialty || '',
        phone: source.phone || '',
        bio: source.bio || '',
      });
    }
    if (profileData?.clinic) {
      setClinic({
        name: profileData.clinic.name || '',
        address: profileData.clinic.address || '',
        phone: profileData.clinic.phone || '',
        email: profileData.clinic.email || '',
        website: profileData.clinic.website || '',
      });
    }
  }, [profileData, user]);

  const set =
    (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const updateMut = useMutation({
    mutationFn: () => userApi.updateMe(form),
    onSuccess: (res) => {
      updateUser(res.data);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Update failed'),
  });

  const clinicMut = useMutation({
    mutationFn: () => userApi.updateClinic(clinic),
    onSuccess: () => toast.success('Clinic letterhead updated!'),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Clinic update failed'),
  });

  const pwMut = useMutation({
    mutationFn: () => userApi.updatePassword(pw),
    onSuccess: () => {
      toast.success('Password changed!');
      setPw({ currentPassword: '', newPassword: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Password change failed'),
  });

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-primary-700" /> Profile & Settings
        </h1>
      </div>

      {/* Avatar */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-bold text-xl">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </span>
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <span className="badge-routine mt-1 capitalize">
            {user?.role?.toLowerCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Personal Info */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input className="input" value={form.firstName} onChange={set('firstName')} />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Specialty</label>
            <input
              className="input"
              value={form.specialty}
              onChange={set('specialty')}
              placeholder="e.g., Radiology, Neuroradiology"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+1 555 0100"
            />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea
            className="input min-h-[90px]"
            value={form.bio}
            onChange={set('bio')}
            placeholder="Brief professional bio..."
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => updateMut.mutate()}
            disabled={updateMut.isPending}
            className="btn-primary"
          >
            {updateMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}{' '}
            Save Profile
          </button>
        </div>
      </div>

      {/* Clinic & Letterhead */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary-700" /> Clinic & Report Letterhead
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Clinic Name</label>
            <input
              className="input"
              value={clinic.name}
              onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
              placeholder="Radioloq Medical Center"
            />
          </div>
          <div>
            <label className="label">Clinic Phone</label>
            <input
              className="input"
              value={clinic.phone}
              onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
              placeholder="+1 555 0100"
            />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={clinic.address}
            onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
            placeholder="123 Medical Ave"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => clinicMut.mutate()}
            disabled={clinicMut.isPending}
            className="btn-secondary"
          >
            {clinicMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}{' '}
            Save Clinic Info
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-700" /> Change Password
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New Password (min 8 chars)</label>
            <input
              type="password"
              className="input"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => pwMut.mutate()}
            disabled={pwMut.isPending || !pw.currentPassword || pw.newPassword.length < 8}
            className="btn-secondary"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
