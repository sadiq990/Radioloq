import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import { Radio, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'DOCTOR',
    specialty: '',
    clinicName: '',
  });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Radioloq</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Create account</h2>
          <p className="text-slate-500 text-sm mb-6">Join the Radioloq platform</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input
                  className="input"
                  value={form.firstName}
                  onChange={set('firstName')}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <label className="label">Last name</label>
                <input
                  className="input"
                  value={form.lastName}
                  onChange={set('lastName')}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={set('email')}
                required
                placeholder="you@hospital.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={set('password')}
                required
                placeholder="Min 8 characters"
                minLength={8}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="DOCTOR">Doctor / Radiologist</option>
                <option value="PATIENT">Patient</option>
                <option value="CLINIC_ADMIN">Clinic Administrator</option>
              </select>
            </div>
            {form.role === 'DOCTOR' && (
              <div>
                <label className="label">Specialty</label>
                <input
                  className="input"
                  value={form.specialty}
                  onChange={set('specialty')}
                  placeholder="Radiology, Neuroradiology..."
                />
              </div>
            )}
            {form.role === 'CLINIC_ADMIN' && (
              <div>
                <label className="label">Clinic Name</label>
                <input
                  className="input"
                  value={form.clinicName}
                  onChange={set('clinicName')}
                  placeholder="City Diagnostic Imaging Center"
                />
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
