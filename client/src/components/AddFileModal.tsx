import { useEffect, useMemo, useState } from 'react';

type AddFileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateCode: (name: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  existingNames: string[];
  existingFolders: string[];
  initialTab?: 'code' | 'upload' | 'folder';
  errorMessage?: string | null;
  isLoading?: boolean;
};

export default function AddFileModal({
  isOpen,
  onClose,
  onCreateCode,
  onCreateFolder,
  onUploadFile,
  existingNames,
  existingFolders,
  initialTab = 'code',
  errorMessage,
  isLoading,
}: AddFileModalProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'upload' | 'folder'>('code');
  const [filename, setFilename] = useState('');
  const [folderName, setFolderName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFilename('');
      setFolderName('');
      setFile(null);
      setLocalError(null);
      setActiveTab('code');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const normalizedNames = useMemo(
    () => existingNames.map((name) => name.trim().toLowerCase()),
    [existingNames]
  );
  const normalizedFolders = useMemo(
    () => existingFolders.map((name) => name.trim().toLowerCase()),
    [existingFolders]
  );
  const isDuplicate =
    filename.trim().length > 0 && normalizedNames.includes(filename.trim().toLowerCase());
  const isFolderDuplicate =
    folderName.trim().length > 0 && normalizedFolders.includes(folderName.trim().toLowerCase());

  useEffect(() => {
    if (activeTab === 'folder' && isFolderDuplicate) {
      setLocalError('Ya existe una carpeta con ese nombre');
    } else if (activeTab !== 'folder' && isDuplicate) {
      setLocalError('Ya existe un archivo con ese nombre');
    } else {
      setLocalError(null);
    }
  }, [activeTab, isDuplicate, isFolderDuplicate]);

  if (!isOpen) return null;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!filename.trim() || isDuplicate) return;
    await onCreateCode(filename.trim());
    setFilename('');
  };

  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!folderName.trim() || isFolderDuplicate) return;
    await onCreateFolder(folderName.trim());
    setFolderName('');
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    await onUploadFile(file);
    setFile(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Agregar Archivo</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
            type="button"
          >
            Crear Codigo
          </button>
          <button
            className={`modal-tab ${activeTab === 'folder' ? 'active' : ''}`}
            onClick={() => setActiveTab('folder')}
            type="button"
          >
            Crear Carpeta
          </button>
          <button
            className={`modal-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
            type="button"
          >
            Subir Archivo
          </button>
        </div>
        <div className="modal-body">
          {activeTab === 'code' && (
            <form onSubmit={handleCreate} className="modal-form">
              <label className="modal-label">
                Nombre del archivo
                <input
                  className="modal-input"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="ej: script.ts"
                />
              </label>
              {(localError || errorMessage) && (
                <div className="modal-error">{localError || errorMessage}</div>
              )}
              <button
                className="modal-submit"
                type="submit"
                disabled={isLoading || !filename.trim() || isDuplicate}
              >
                {isLoading ? 'Creando...' : 'Crear'}
              </button>
            </form>
          )}
          {activeTab === 'folder' && (
            <form onSubmit={handleCreateFolder} className="modal-form">
              <label className="modal-label">
                Nombre de la carpeta
                <input
                  className="modal-input"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="ej: src"
                />
              </label>
              {(localError || errorMessage) && (
                <div className="modal-error">{localError || errorMessage}</div>
              )}
              <button
                className="modal-submit"
                type="submit"
                disabled={isLoading || !folderName.trim() || isFolderDuplicate}
              >
                {isLoading ? 'Creando...' : 'Crear Carpeta'}
              </button>
            </form>
          )}
          {activeTab === 'upload' && (
            <form onSubmit={handleUpload} className="modal-form">
              <label className="modal-label">
                Selecciona un archivo
                <input
                  className="modal-input"
                  type="file"
                  accept=".pdf,*/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {errorMessage && <div className="modal-error">{errorMessage}</div>}
              <button className="modal-submit" type="submit" disabled={isLoading || !file}>
                {isLoading ? 'Subiendo...' : 'Subir'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
