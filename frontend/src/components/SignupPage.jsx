import { useState } from "react";

const ROLES = [
  {
    id: "student",
    label: "Student",
    blurb: "Book classrooms and halls, track approval status",
  },
  {
    id: "faculty",
    label: "Faculty",
    blurb: "Bookings confirm instantly",
  },
  {
    id: "admin",
    label: "Admin",
    blurb: "Dean's office — manage venues and approvals",
  },
];

export default function SignupPage({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.password !== form.confirmPassword)
      next.confirmPassword = "Passwords don't match.";
    if (!form.role) next.role = "Choose a role to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message || 'Registration failed' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 relative flex-col justify-between bg-slate-900 text-stone-100 px-12 py-14 overflow-hidden">
        <BuildingMotif />
        <div className="relative z-10 flex items-center gap-4">
          <img
            src="/logo/amrita-emblem-white.png"
            alt="Amrita Vishwa Vidyapeetham"
            className="h-14 w-auto"
          />
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="text-sm tracking-wide text-amber-400">Campus Venue Management</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight">
              BookMyVenue
            </h1>
          </div>
        </div>
        <div className="relative z-10 max-w-xs">
          <p className="text-stone-300 text-sm leading-relaxed">
            Four blocks, every floor, every classroom and hall — reserved,
            reviewed, and approved in one place.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img
              src="/logo/amrita-emblem.png"
              alt="Amrita Vishwa Vidyapeetham"
              className="h-12 w-auto"
            />
            <div>
              <p className="text-sm tracking-wide text-amber-700">Campus Venue Management</p>
              <h1 className="mt-0.5 font-serif text-2xl text-slate-900">BookMyVenue</h1>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-stone-600">
            Already have one?{" "}
            <a href="/login" className="text-slate-900 underline underline-offset-2">
              Log in
            </a>
          </p>

          {errors.form && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <Field label="Full name" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass(errors.name)}
                placeholder="Zahwa K"
                autoComplete="name"
              />
            </Field>

            <Field label="Campus email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass(errors.email)}
                placeholder="you@amrita.edu"
                autoComplete="email"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Password" error={errors.password}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className={inputClass(errors.password) + " pr-9"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-stone-400 hover:text-stone-700 transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </Field>
              <Field label="Confirm" error={errors.confirmPassword}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    className={inputClass(errors.confirmPassword) + " pr-9"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-stone-400 hover:text-stone-700 transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </Field>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-800 mb-2">
                I am a
              </span>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((r) => {
                  const selected = form.role === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => update("role", r.id)}
                      className={`text-left rounded-md border px-3 py-3 transition-colors ${
                        selected
                          ? "border-amber-600 bg-amber-50"
                          : "border-stone-300 bg-white hover:border-stone-400"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">
                        {r.label}
                      </span>
                      <span className="block mt-1 text-xs text-stone-500 leading-snug">
                        {r.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.role && (
                <p className="mt-2 text-sm text-red-700">{errors.role}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>

            <p className="text-xs text-stone-500 leading-relaxed">
              Faculty who coordinate a block are assigned block-head access
              separately by the admin after signup.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-800 mb-1.5">
        {label}
      </span>
      {children}
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </label>
  );
}

function inputClass(error) {
  return `w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
    error
      ? "border-red-400 focus:ring-red-300"
      : "border-stone-300 focus:ring-slate-400"
  }`;
}

function BuildingMotif() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.14]"
      viewBox="0 0 400 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {[0, 1, 2, 3].map((block) => (
        <g key={block} transform={`translate(${40 + block * 95}, 80)`}>
          <rect
            x="0"
            y="0"
            width="70"
            height="440"
            stroke="white"
            strokeWidth="1"
          />
          {[0, 1, 2, 3, 4, 5].map((floor) => (
            <line
              key={floor}
              x1="0"
              y1={73 * (floor + 1)}
              x2="70"
              y2={73 * (floor + 1)}
              stroke="white"
              strokeWidth="0.75"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
