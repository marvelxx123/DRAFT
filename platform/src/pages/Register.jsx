import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (err) { setError(err.message); setLoading(false) }
    else navigate('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black mesh-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="font-display font-bold text-3xl gradient-text">NEXUS</Link>
          <p className="text-white/40 mt-3 text-sm">Create your account — 30 free credits, no card needed</p>
        </div>

        <div className="glass gradient-border rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="input-field" placeholder="Alex Johnson" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@brand.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="Min 8 characters" required />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? <Loader2 size={16} className="spin" /> : <>Create Account <ArrowRight size={14} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          By signing up you agree to our Terms and Privacy Policy.
        </p>
        <p className="text-center text-sm text-white/30 mt-3">
          Have an account?{' '}
          <Link to="/login" className="text-accent-light hover:underline">Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
