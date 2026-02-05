import { useState } from 'react';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
  errorMessage?: string | null;
  isLoading?: boolean;
};

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
  errorMessage,
  isLoading,
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onLogin(username.trim(), password);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Acceso Admin</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="modal-label">
            Usuario
            <input
              className="modal-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="modal-label">
            Contraseña
            <input
              className="modal-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {errorMessage && <div className="modal-error">{errorMessage}</div>}
          <button className="modal-submit" type="submit" disabled={isLoading}>
            {isLoading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
