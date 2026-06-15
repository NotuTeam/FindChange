import { useState } from 'react';
import { DebugWatcher, useDebugState } from 'findchange';

interface FormData {
  // Step 1: Personal
  fullName: string;
  email: string;
  phone: string;
  // Step 2: Address
  country: string;
  city: string;
  postalCode: string;
  // Step 3: Preferences
  plan: 'basic' | 'pro' | 'enterprise';
  newsletter: boolean;
  notes: string;
}

const STEPS = ['Personal', 'Address', 'Preferences', 'Review'];

const COUNTRIES = ['Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Other'];

const EMPTY_FORM: FormData = {
  fullName: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  postalCode: '',
  plan: 'basic',
  newsletter: true,
  notes: '',
};

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<{ step: number; timestamp: number }[]>([]);

  // --- Watch states in debug window ---
  useDebugState('form', form);
  useDebugState('currentStep', step);
  useDebugState('errors', errors);
  useDebugState('stepHistory', history);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!form.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.email = 'Invalid email format';
      if (!form.phone.trim()) newErrors.phone = 'Phone is required';
    }

    if (step === 1) {
      if (!form.country) newErrors.country = 'Country is required';
      if (!form.city.trim()) newErrors.city = 'City is required';
      if (!form.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setHistory((prev) => [...prev, { step, timestamp: Date.now() }]);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setStep(0);
    setErrors({});
    setHistory([]);
    setSubmitted(false);
  };

  const submit = () => {
    setHistory((prev) => [...prev, { step, timestamp: Date.now() }]);
    setSubmitted(true);
  };

  return (
    <div className="app">
      <h1>Multi-Step Registration</h1>
      <p className="subtitle">
        Demo form for <code>findchange</code>. Click the floating <strong>Debug</strong> button
        (bottom-right) to open the debug window and watch states change in real-time.
      </p>

      <div className="hint">
        💡 Tip: Fill the form, navigate between steps, and watch the <code>form</code>,{' '}
        <code>currentStep</code>, <code>errors</code>, and <code>stepHistory</code> states update
        live in the separate debug window.
      </div>

      <div className="card">
        {submitted ? (
          <div className="success">
            <div className="check">✓</div>
            <h2>Registration Complete!</h2>
            <p>Welcome aboard, {form.fullName}!</p>
            <button className="btn btn-secondary" onClick={reset}>
              Start Over
            </button>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="step-label">
              Step {step + 1} of {STEPS.length}: <span className="current">{STEPS[step]}</span>
            </div>
            <div className="stepper">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                />
              ))}
            </div>

            {/* Step 0: Personal */}
            {step === 0 && (
              <>
                <div className="field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    placeholder="John Doe"
                  />
                  {errors.fullName && <div className="error">{errors.fullName}</div>}
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                  {errors.email && <div className="error">{errors.email}</div>}
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+62 812 3456 7890"
                  />
                  {errors.phone && <div className="error">{errors.phone}</div>}
                </div>
              </>
            )}

            {/* Step 1: Address */}
            {step === 1 && (
              <>
                <div className="field">
                  <label>Country</label>
                  <select
                    value={form.country}
                    onChange={(e) => update('country', e.target.value)}
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.country && <div className="error">{errors.country}</div>}
                </div>
                <div className="field">
                  <label>City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="Jakarta"
                  />
                  {errors.city && <div className="error">{errors.city}</div>}
                </div>
                <div className="field">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => update('postalCode', e.target.value)}
                    placeholder="12345"
                  />
                  {errors.postalCode && <div className="error">{errors.postalCode}</div>}
                </div>
              </>
            )}

            {/* Step 2: Preferences */}
            {step === 2 && (
              <>
                <div className="field">
                  <label>Plan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => update('plan', e.target.value as FormData['plan'])}
                  >
                    <option value="basic">Basic - Free</option>
                    <option value="pro">Pro - $9/mo</option>
                    <option value="enterprise">Enterprise - Contact us</option>
                  </select>
                </div>
                <div className="field">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.newsletter}
                      onChange={(e) => update('newsletter', e.target.checked)}
                      style={{ width: 'auto', marginRight: 8 }}
                    />
                    Subscribe to newsletter
                  </label>
                </div>
                <div className="field">
                  <label>Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Anything else you'd like us to know?"
                  />
                </div>
              </>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <>
                <div className="summary">
                  <h3>Personal Info</h3>
                  <div className="summary-row">
                    <span className="key">Name</span>
                    <span className="val">{form.fullName || '-'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="key">Email</span>
                    <span className="val">{form.email || '-'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="key">Phone</span>
                    <span className="val">{form.phone || '-'}</span>
                  </div>
                </div>
                <div className="summary">
                  <h3>Address</h3>
                  <div className="summary-row">
                    <span className="key">Country</span>
                    <span className="val">{form.country || '-'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="key">City</span>
                    <span className="val">{form.city || '-'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="key">Postal</span>
                    <span className="val">{form.postalCode || '-'}</span>
                  </div>
                </div>
                <div className="summary">
                  <h3>Preferences</h3>
                  <div className="summary-row">
                    <span className="key">Plan</span>
                    <span className="val">{form.plan}</span>
                  </div>
                  <div className="summary-row">
                    <span className="key">Newsletter</span>
                    <span className="val">{form.newsletter ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="key">Notes</span>
                    <span className="val">{form.notes || '-'}</span>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="actions">
              <button
                className="btn btn-secondary"
                onClick={back}
                disabled={step === 0}
              >
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary" onClick={next}>
                  Next
                </button>
              ) : (
                <button className="btn btn-primary" onClick={submit}>
                  Submit
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating debug button - only visible in development */}
      <DebugWatcher />
    </div>
  );
}
