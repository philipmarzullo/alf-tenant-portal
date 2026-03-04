import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const COMPANY_SIZES = [
  '1-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000-5000',
  '5000+',
];

const INTERESTS = [
  'Operational Visibility',
  'AI Agents & Intelligence',
  'Full Automation',
  'Not sure yet',
];

const VALUE_POINTS = [
  'See agents built for your departments — working from day one',
  'Watch your procedures become live workflows with real routing',
  'Connect your data and see agents act on it, not just display it',
  'Get a white-labeled portal generated from your company profile',
];

const inputClass =
  'w-full px-3.5 py-2.5 text-sm border border-alf-bone rounded-lg bg-white focus:outline-none focus:border-alf-orange text-alf-dark placeholder:text-alf-slate/60';

export default function RequestDemoPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_name: '',
    job_title: '',
    company_size: '',
    interest: '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | submitted | error
  const [errorMsg, setErrorMsg] = useState('');

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('submitted');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  // Success state
  if (status === 'submitted') {
    return (
      <div className="py-28 md:py-40">
        <div className="max-w-lg mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-alf-orange/10 mb-6">
            <CheckCircle size={32} className="text-alf-orange" />
          </div>
          <h1
            className="text-3xl md:text-4xl text-alf-dark mb-4"
            style={{ fontFamily: 'var(--font-marketing-heading)' }}
          >
            Thanks, {form.first_name}.
          </h1>
          <p
            className="text-alf-slate text-lg mb-10"
            style={{ fontFamily: 'var(--font-marketing-body)' }}
          >
            We'll be in touch within one business day to schedule your demo.
          </p>
          <Link
            to="/"
            className="text-sm font-medium text-alf-orange hover:text-alf-orange/80 transition-colors"
            style={{ fontFamily: 'var(--font-marketing-body)' }}
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          {/* Left — Value prop */}
          <div className="md:pt-4">
            <h1
              className="text-4xl md:text-5xl text-alf-dark mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-marketing-heading)' }}
            >
              See Alf in action
            </h1>
            <div className="w-12 h-[3px] bg-alf-orange rounded-full mb-6" />
            <p
              className="text-alf-slate text-base leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-marketing-body)' }}
            >
              In 30 minutes, we'll show you how Alf gives every department AI agents
              that do the work those departments do — and turns your procedures into
              live workflows that actually execute.
            </p>
            <ul className="space-y-4" style={{ fontFamily: 'var(--font-marketing-body)' }}>
              {VALUE_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-alf-dark">
                  <span className="text-alf-orange mt-0.5 shrink-0 text-base">&#10003;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Form */}
          <div className="bg-white border border-alf-bone rounded-xl shadow-sm p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                    First Name <span className="text-alf-orange">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={update('first_name')}
                    placeholder="First name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                    Last Name <span className="text-alf-orange">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={update('last_name')}
                    placeholder="Last name"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  Work Email <span className="text-alf-orange">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  Company Name <span className="text-alf-orange">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.company_name}
                  onChange={update('company_name')}
                  placeholder="Your company"
                  className={inputClass}
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={update('job_title')}
                  placeholder="Your role"
                  className={inputClass}
                />
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  Company Size
                </label>
                <select
                  value={form.company_size}
                  onChange={update('company_size')}
                  className={`${inputClass} ${!form.company_size ? 'text-alf-slate/60' : ''}`}
                >
                  <option value="">Select...</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>{size} employees</option>
                  ))}
                </select>
              </div>

              {/* Interest */}
              <div>
                <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  What interests you most?
                </label>
                <select
                  value={form.interest}
                  onChange={update('interest')}
                  className={`${inputClass} ${!form.interest ? 'text-alf-slate/60' : ''}`}
                >
                  <option value="">Select...</option>
                  {INTERESTS.map((interest) => (
                    <option key={interest} value={interest}>{interest}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-alf-dark mb-1.5" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  Anything else?
                </label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={update('message')}
                  placeholder="Tell us about your operations or what you'd like to see..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Error */}
              {status === 'error' && (
                <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-marketing-body)' }}>
                  {errorMsg}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full px-7 py-3.5 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-marketing-body)' }}
              >
                {status === 'submitting' ? 'Submitting...' : 'Request Your Demo'}
              </button>

              <p
                className="text-xs text-alf-slate/60 text-center"
                style={{ fontFamily: 'var(--font-marketing-body)' }}
              >
                We'll reach out within one business day.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
