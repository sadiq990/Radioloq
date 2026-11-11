import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { userApi, consultationApi } from '../lib/api';
import { Search, Users, MapPin, Stethoscope, CalendarPlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DirectoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bookingDoc, setBookingDoc] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [urgency, setUrgency] = useState('ROUTINE');

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, specialty],
    queryFn: () =>
      userApi
        .getDoctors({
          search: search || undefined,
          specialty: specialty || undefined,
        })
        .then((r) => r.data),
  });

  const bookMut = useMutation({
    mutationFn: () =>
      consultationApi.create({
        doctorId: bookingDoc.id,
        clinicalQuestion: question,
        urgency,
      }),
    onSuccess: (res) => {
      toast.success('Consultation requested!');
      setBookingDoc(null);
      setQuestion('');
      navigate(`/consultations/${res.data.id}`);
    },
    onError: () => toast.error('Failed to book consultation'),
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-700" /> Doctor Directory
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Find verified radiologists and specialists for remote consultations
        </p>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by doctor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Filter by specialty..."
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded mb-2 w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        {data?.doctors?.map((doc: any) => (
          <div key={doc.id} className="card hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-bold text-lg">
                  {doc.firstName[0]}
                  {doc.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">
                  {doc.firstName} {doc.lastName}
                </h3>
                {doc.specialty && <p className="text-sm text-primary-700">{doc.specialty}</p>}
                {doc.clinic?.name && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {doc.clinic.name}
                  </p>
                )}
                {doc.bio && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{doc.bio}</p>}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setBookingDoc(doc)}
                className="btn-secondary w-full text-xs py-2"
              >
                <CalendarPlus className="w-3.5 h-3.5" /> Request Consultation
              </button>
            </div>
          </div>
        ))}
        {!isLoading && data?.doctors?.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No doctors found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Consult {bookingDoc.firstName} {bookingDoc.lastName}
              </h2>
              <button onClick={() => setBookingDoc(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Urgency</label>
                <select
                  className="input"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT</option>
                </select>
              </div>
              <div>
                <label className="label">Clinical History / Question</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Describe your symptoms or second-opinion question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBookingDoc(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => bookMut.mutate()}
                  disabled={!question.trim() || bookMut.isPending}
                  className="btn-primary"
                >
                  {bookMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
