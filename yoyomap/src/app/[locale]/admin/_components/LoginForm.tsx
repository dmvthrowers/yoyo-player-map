export function LoginForm({ pass, setPass, error, loading, onSignIn }: {
  pass: string;
  setPass: (value: string) => void;
  error: string;
  loading: boolean;
  onSignIn: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="text-3xl mb-4">Admin</h1>
        <p className="text-sm text-navy/70 mb-4">Enter the admin password to continue.</p>
        <input
          className="input mb-4"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSignIn();
          }}
          placeholder="Admin password"
        />
        {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm mb-3">{error}</div>}
        <button
          className="btn-primary w-full"
          disabled={loading}
          onClick={onSignIn}
        >
          {loading ? 'Checking...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}
