type FileViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  file: { name: string; content: string; language: string };
  apiBaseUrl: string;
};

const getUrl = (content: string, apiBaseUrl: string) =>
  content.startsWith('http') ? content : `${apiBaseUrl}${content}`;

const getType = (name: string, language: string) => {
  const lower = name.toLowerCase();
  if (language === 'pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (language === 'image' || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower)) return 'image';
  if (language === 'video' || /\.(mp4|webm|ogg)$/i.test(lower)) return 'video';
  if (language === 'audio' || /\.(mp3|wav|ogg)$/i.test(lower)) return 'audio';
  if (language === 'office' || /\.(docx|xlsx|pptx)$/i.test(lower)) return 'office';
  return 'binary';
};

export default function FileViewerModal({ isOpen, onClose, file, apiBaseUrl }: FileViewerModalProps) {
  if (!isOpen) return null;

  const src = getUrl(file.content, apiBaseUrl);
  const type = getType(file.name, file.language);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-pdf" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{file.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="pdf-container viewer-container">
          {type === 'image' && <img className="viewer-image" src={src} alt={file.name} />}
          {type === 'video' && <video className="viewer-media" src={src} controls />}
          {type === 'audio' && <audio className="viewer-audio" src={src} controls />}
          {type === 'pdf' && <iframe className="pdf-frame" src={src} title={file.name} />}
          {type === 'office' && (
            <iframe className="pdf-frame" src={src} title={file.name} />
          )}
          {type === 'binary' && (
            <div className="viewer-fallback">
              No hay vista previa disponible.
              <a className="viewer-link" href={src} target="_blank" rel="noreferrer">Descargar</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
