import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { VehicleImage as VImg } from '@/types/vehicle';
import { cld } from '@/lib/cloudinary';

export function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: VImg[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const [zoom, setZoom] = useState(false);

  const prev = useCallback(
    () => onNavigate((index - 1 + images.length) % images.length),
    [index, images.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % images.length),
    [index, images.length, onNavigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  const current = images[index];

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-navy-950/95 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="flex items-center justify-between px-5 py-4 text-white">
          <span className="text-sm font-semibold text-brand-100/80">
            {index + 1} / {images.length} · {current?.tag ?? 'view'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setZoom((z) => !z); }}
              className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Zoom"
            >
              <ZoomIn className="size-5" />
            </button>
            <button
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={prev}
            className="absolute left-3 z-10 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft className="size-6" />
          </button>

          <motion.img
            key={current?.publicId}
            src={cld(current?.publicId, { width: 1600, crop: 'fit' })}
            alt={current?.alt}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: zoom ? 1.6 : 1 }}
            transition={{ duration: 0.35 }}
            className="max-h-[72vh] max-w-full cursor-zoom-in object-contain"
            onClick={() => setZoom((z) => !z)}
          />

          <button
            onClick={next}
            className="absolute right-3 z-10 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>

        <div
          className="no-scrollbar flex gap-3 overflow-x-auto px-5 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.publicId}
              onClick={() => { onNavigate(i); setZoom(false); }}
              className={
                'h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ' +
                (i === index ? 'border-amber-500' : 'border-white/15 opacity-60 hover:opacity-100')
              }
            >
              <img
                src={cld(img.publicId, { width: 200, height: 130, crop: 'fill' })}
                alt={img.alt}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
