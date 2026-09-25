// Eine eigene Kamera oder Optik der Geraetebibliothek vorschlagen. Der
// Vorschlag geht in die Moderation; der Datenblattlink ist Pflicht, weil
// eine Zahl ohne Beleg dort genauso wenig gilt wie hier (`specSource`).
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { format, useTranslation } from '../../i18n';
import { LibraryError, deviceUrl, type LibraryErrorCode } from '../../utils/deviceLibraryClient';
import { useDeviceLibrary } from '../../library/store';
import LibraryErrorLine from './LibraryErrorLine';
import type { LibraryItem } from '../../library/facet';
import { openSettings } from '../Settings/openSettings';

const istLink = (s: string) => /^https?:\/\/\S+\.\S+$/i.test(s.trim());

export default function ProposeDialog({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const { t } = useTranslation();
  const signedIn = useDeviceLibrary((s) => s.signedIn);
  const server = useDeviceLibrary((s) => s.server);
  const propose = useDeviceLibrary((s) => s.propose);
  const entry = item.kind === 'camera' ? item.camera : item.lens;
  const [sourceUrl, setSourceUrl] = useState(entry.manufacturerUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: LibraryErrorCode; detail?: string } | null>(null);
  const [done, setDone] = useState<{ slug: string; state: string } | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const name = `${entry.manufacturer} ${entry.model}`.trim();
  const knopf = 'border border-bc-border text-xs text-bc-text transition-colors hover:bg-bc-panel-raised disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-bc-scrim p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('library.propose.title', 'Submit to device library')}
        className="flex w-full max-w-[480px] flex-col border border-bc-border bg-bc-panel"
      >
        <div className="bc-panel-head justify-between">
          <span className="text-sm font-bold text-bc-text-bright">{t('library.propose.title', 'Submit to device library')}</span>
          <button type="button" onClick={onClose} className="text-bc-muted hover:text-bc-text-bright" aria-label={t('library.close', 'Close')}>
            <FiX size={16} />
          </button>
        </div>
        <div className="text-xs" style={{ padding: '16px' }}>
          <p className="text-bc-text">
            {format(
              item.kind === 'camera'
                ? t('library.propose.camera', 'Camera “{name}” with its sensor, mounts, adapters and sources.')
                : t('library.propose.lens', 'Lens “{name}” with its focal range, aperture, mount and image circle.'),
              { name },
            )}
          </p>

          {done ? (
            <div style={{ marginTop: '12px' }}>
              <p className="text-bc-green">
                {t('library.propose.done', 'Submitted. Others see it once a moderator has approved it.')}
              </p>
              <a href={deviceUrl(server, done.slug)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-bc-accent hover:underline">
                {t('library.propose.open', 'Open in the library')}
              </a>
            </div>
          ) : !signedIn ? (
            <div style={{ marginTop: '12px' }}>
              <p className="text-bc-muted">
                {t('library.propose.signInFirst', 'Submitting needs an account at the device library. Sign in first.')}
              </p>
              <button
                type="button"
                className={`${knopf} mt-2`}
                style={{ padding: '6px 12px' }}
                onClick={() => {
                  onClose();
                  openSettings('library');
                }}
              >
                {t('library.propose.goSignIn', 'Sign in…')}
              </button>
            </div>
          ) : (
            <form
              style={{ marginTop: '12px' }}
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                setError(null);
                propose(item, sourceUrl)
                  .then(setDone)
                  .catch((err: unknown) =>
                    setError(err instanceof LibraryError ? { code: err.code, detail: err.message !== err.code ? err.message : undefined } : { code: 'server' }),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <label className="block text-bc-muted">
                {t('library.propose.source', 'Datasheet link (required)')}
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://"
                  className="mt-1 block w-full border border-bc-border bg-bc-dark text-bc-text-bright"
                  style={{ padding: '6px 8px' }}
                />
              </label>
              {sourceUrl.trim() !== '' && !istLink(sourceUrl) && (
                <p className="mt-1 text-bc-red">{t('library.propose.sourceInvalid', 'Enter a full link (https://…) to the manufacturer’s datasheet.')}</p>
              )}
              <button
                type="submit"
                className="mt-3 border border-bc-accent bg-bc-accent text-bc-accent-text disabled:opacity-50"
                style={{ padding: '6px 12px' }}
                disabled={busy || !istLink(sourceUrl)}
              >
                {busy ? t('library.propose.sending', 'Submitting…') : t('library.propose.submit', 'Submit')}
              </button>
            </form>
          )}

          {error && (
            <LibraryErrorLine code={error.code} detail={error.detail} />
          )}
        </div>
      </div>
    </div>
  );
}
