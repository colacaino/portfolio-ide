import { useState, useEffect } from 'react';

type Profile = {
  name: string;
  title: string;
  bio: string;
  location: string;
  email: string;
  website: string;
  github: string;
  linkedin: string;
  avatarUrl: string;
};

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
  onLogout: () => void;
  loginError?: string | null;
  loginLoading?: boolean;
  profile: Profile;
  onSaveProfile: (profile: Profile) => void;
};

export default function ProfileModal({
  isOpen,
  onClose,
  isAdmin,
  onLogin,
  onLogout,
  loginError,
  loginLoading,
  profile,
  onSaveProfile,
}: ProfileModalProps) {
  const [tab, setTab] = useState<'profile' | 'login' | 'register'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(isAdmin ? 'profile' : 'login');
      setIsEditing(false);
      setDraft(profile);
    }
  }, [isOpen, isAdmin, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveProfile(draft);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (file?: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiBaseUrl}/api/profile/avatar`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: localStorage.getItem('auth_token')
          ? `Bearer ${localStorage.getItem('auth_token')}`
          : '',
      },
    });
    if (response.ok) {
      const data = await response.json();
      setDraft((prev) => ({ ...prev, avatarUrl: data.avatar_data || '' }));
      onSaveProfile({
        ...draft,
        avatarUrl: data.avatar_data || '',
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-profile" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isAdmin ? 'Perfil del Admin' : 'Bienvenido'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
            type="button"
          >
            Perfil
          </button>
          {!isAdmin && (
            <>
              <button
                className={`modal-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => setTab('login')}
                type="button"
              >
                Iniciar sesión
              </button>
              <button
                className={`modal-tab ${tab === 'register' ? 'active' : ''}`}
                onClick={() => setTab('register')}
                type="button"
              >
                Crear cuenta
              </button>
            </>
          )}
        </div>

        <div className="modal-body">
          {tab === 'profile' && (
            <div className="profile-grid">
              <div className="profile-left">
                <img className="profile-avatar" src={draft.avatarUrl} alt={draft.name} />
                {isAdmin && isEditing && (
                  <label className="modal-label">
                    Foto de perfil
                    <input
                      className="modal-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                    />
                  </label>
                )}
                {!isEditing && isAdmin && (
                  <button className="modal-submit" onClick={() => setIsEditing(true)}>
                    Editar perfil
                  </button>
                )}
                {isAdmin && isEditing && (
                  <div className="profile-actions">
                    <button className="modal-submit" onClick={handleSave}>Guardar</button>
                    <button className="modal-cancel" onClick={() => { setDraft(profile); setIsEditing(false); }}>
                      Cancelar
                    </button>
                  </div>
                )}
                {isAdmin && (
                  <button className="modal-ghost" onClick={onLogout}>Cerrar sesión</button>
                )}
              </div>
              <div className="profile-right">
                <label className="modal-label">
                  Nombre
                  <input
                    className="modal-input"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </label>
                <label className="modal-label">
                  Rol / Título
                  <input
                    className="modal-input"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    disabled={!isEditing}
                  />
                </label>
                <label className="modal-label">
                  Bio
                  <textarea
                    className="modal-textarea"
                    value={draft.bio}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    disabled={!isEditing}
                  />
                </label>
                <div className="profile-row">
                  <label className="modal-label">
                    Ubicación
                    <input
                      className="modal-input"
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      disabled={!isEditing}
                    />
                  </label>
                  <label className="modal-label">
                    Email
                    <input
                      className="modal-input"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </label>
                </div>
                <label className="modal-label">
                  Website
                  <input
                    className="modal-input"
                    value={draft.website}
                    onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                    disabled={!isEditing}
                  />
                </label>
                <div className="profile-row">
                  <label className="modal-label">
                    GitHub
                    <input
                      className="modal-input"
                      value={draft.github}
                      onChange={(e) => setDraft({ ...draft, github: e.target.value })}
                      disabled={!isEditing}
                    />
                  </label>
                  <label className="modal-label">
                    LinkedIn
                    <input
                      className="modal-input"
                      value={draft.linkedin}
                      onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })}
                      disabled={!isEditing}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === 'login' && (
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onLogin(username, password);
              }}
            >
              <label className="modal-label">
                Usuario
                <input
                  className="modal-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label className="modal-label">
                Contraseña
                <input
                  className="modal-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {loginError && <div className="modal-error">{loginError}</div>}
              <button className="modal-submit" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form
              className="modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: regUser, email: regEmail, password: regPass }),
                });
                if (response.ok) {
                  setRegisterStatus('Cuenta creada. Inicia sesión.');
                  setTab('login');
                } else {
                  setRegisterStatus('No se pudo crear la cuenta.');
                }
              }}
            >
              <label className="modal-label">
                Email
                <input
                  className="modal-input"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </label>
              <label className="modal-label">
                Usuario
                <input
                  className="modal-input"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                />
              </label>
              <label className="modal-label">
                Contraseña
                <input
                  className="modal-input"
                  type="password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                />
              </label>
              <div className="modal-info">
                Crea una cuenta y luego inicia sesión.
              </div>
              {registerStatus && <div className="modal-info">{registerStatus}</div>}
              <button className="modal-submit" type="submit">
                Crear cuenta
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
