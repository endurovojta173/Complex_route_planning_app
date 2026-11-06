import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink, Download, Smartphone, QrCode, MapPin, Layers, ShieldCheck, Loader2 } from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import { createSharedRouteUrl } from '../../utils/routeSharing';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMapName: string;
  geoJson: FeatureCollection | null;
  onShowNotification: (msg: string) => void;
}

export function ShareModal({
  isOpen,
  onClose,
  activeMapName,
  geoJson,
  onShowNotification,
}: ShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!isOpen || !geoJson) return '';
    try {
      return createSharedRouteUrl(activeMapName || 'Sdílená trasa', geoJson);
    } catch {
      return '';
    }
  }, [isOpen, activeMapName, geoJson]);

  const isGenerating = Boolean(shareUrl && !qrDataUrl && !errorMsg);

  useEffect(() => {
    if (!shareUrl) return;

    let isMounted = true;
    QRCode.toDataURL(shareUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'L', // 'L' keeps density manageable for large data payloads
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setErrorMsg(null);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        if (isMounted) {
          setErrorMsg('Data trasy jsou příliš velká pro standardní QR kód. Použijte prosím přímý odkaz.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      onShowNotification('Odkaz na interaktivní trasu byl zkopírován do schránky.');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      onShowNotification('Odkaz se nepodařilo zkopírovat automaticky. Zkopírujte jej ručně z textového pole.');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const safeName = (activeMapName || 'trasa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '');
    link.download = `qr_${safeName}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowNotification('QR kód byl stažen.');
  };

  const handleOpenLink = () => {
    if (!shareUrl) return;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2 className="modal-title">Sdílet trasu na mobil</h2>
            <span className="modal-subtitle">
              Interaktivní mapa v mobilu pro organizátory a účastníky v terénu
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Zavřít"
            aria-label="Zavřít"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body share-modal-body">
          <div className="share-modal-grid">
            {/* Left Column: QR Code */}
            <div className="share-qr-column">
              <div className="share-qr-wrapper">
                {isGenerating ? (
                  <div className="share-qr-loading">
                    <Loader2 size={36} className="spin-icon" />
                    <span>Generuji QR kód...</span>
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR kód trasy"
                    className="share-qr-image"
                  />
                ) : (
                  <div className="share-qr-fallback">
                    <QrCode size={48} />
                    <span>{errorMsg || 'QR kód není dostupný'}</span>
                  </div>
                )}
              </div>

              {qrDataUrl && (
                <button
                  type="button"
                  className="btn-action secondary share-qr-download-btn"
                  onClick={handleDownloadQr}
                  title="Stáhnout QR kód pro tisk na instrukce či plakát"
                >
                  <Download size={15} />
                  <span>Stáhnout QR kód (PNG)</span>
                </button>
              )}
            </div>

            {/* Right Column: Link & Benefits */}
            <div className="share-info-column">
              <div className="share-section">
                <label className="share-section-label" htmlFor="share-url-input">
                  Odkaz na interaktivní mapu:
                </label>
                <div className="share-url-box">
                  <input
                    id="share-url-input"
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="share-url-input"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    className={`btn-action ${isCopied ? 'primary' : 'secondary'} share-copy-btn`}
                    onClick={handleCopy}
                    title="Zkopírovat odkaz"
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{isCopied ? 'Zkopírováno' : 'Kopírovat'}</span>
                  </button>
                </div>
              </div>

              <div className="share-benefits-list">
                <div className="share-benefit-item">
                  <div className="share-benefit-icon">
                    <Smartphone size={17} />
                  </div>
                  <div className="share-benefit-content">
                    <strong>Nulová ztráta kvality při zoomu</strong>
                    <p>Mobil vykresluje čisté vektory (SVG). Při přiblížení se neztrácí ostrost jako u PNG.</p>
                  </div>
                </div>

                <div className="share-benefit-item">
                  <div className="share-benefit-icon">
                    <MapPin size={17} />
                  </div>
                  <div className="share-benefit-content">
                    <strong>Živá GPS poloha v terénu</strong>
                    <p>Po otevření na mobilu může uživatel zapnout GPS a vidí, kde přesně na trase stojí.</p>
                  </div>
                </div>

                <div className="share-benefit-item">
                  <div className="share-benefit-icon">
                    <Layers size={17} />
                  </div>
                  <div className="share-benefit-content">
                    <strong>Přepínání podkladů</strong>
                    <p>Uživatel na telefonu může snadno přepínat mezi standardní mapou a satelitním snímkem.</p>
                  </div>
                </div>

                <div className="share-benefit-item">
                  <div className="share-benefit-icon">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="share-benefit-content">
                    <strong>Bez nutnosti instalace či přihlašování</strong>
                    <p>Funguje okamžitě v každém prohlížeči (iOS Safari, Android Chrome). Data jsou uložena přímo v odkazu.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer share-modal-footer">
          <button
            type="button"
            className="btn-action secondary share-open-btn"
            onClick={handleOpenLink}
            title="Otevřít zobrazení na nové záložce pro vyzkoušení"
          >
            <ExternalLink size={15} />
            <span>Vyzkoušet zobrazení v novém okně</span>
          </button>
          <button
            type="button"
            className="btn-action primary"
            onClick={onClose}
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
