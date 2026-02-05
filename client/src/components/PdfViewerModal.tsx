type PdfViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title?: string;
};

export default function PdfViewerModal({ isOpen, onClose, src, title }: PdfViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-pdf" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || 'Vista PDF'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="pdf-container">
          <iframe className="pdf-frame" src={src} title={title || 'PDF'} />
        </div>
      </div>
    </div>
  );
}
