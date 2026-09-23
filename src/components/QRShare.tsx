import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function QRShare({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary !px-4" aria-haspopup="dialog">
        <span aria-hidden="true">↗</span> Share
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
            role="dialog" aria-modal="true" aria-label={`Share ${name}`}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12 }}
              className="card w-full max-w-xs p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold">Share {name}</h3>
              <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3">
                <QRCode value={url} size={160} aria-label={`QR code linking to ${name}`} />
              </div>
              <p className="mt-3 break-all text-xs" style={{ color: 'var(--text-mute)' }}>{url}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={copy} className="btn btn-primary flex-1 !py-2 !text-sm">
                  {copied ? '✓ Copied!' : 'Copy link'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary !py-2 !text-sm">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
