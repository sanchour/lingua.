import { useEffect, useRef, useState } from 'react';

/** The camera, reading QR codes until one passes `accept`; says so when there's no camera. */
export function QrScanner({ accept, onResult }: { accept: (text: string) => boolean; onResult: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let alive = true;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('none');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!alive || !video.current) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play();
        const { default: jsQR } = await import('jsqr');
        const look = () => {
          const v = video.current;
          if (!alive || !v || !context) return;
          if (v.videoWidth) {
            // A smaller frame reads faster and is plenty for a code held up to the camera.
            const scale = Math.min(1, 640 / v.videoWidth);
            canvas.width = Math.round(v.videoWidth * scale);
            canvas.height = Math.round(v.videoHeight * scale);
            context.drawImage(v, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
            if (code?.data && accept(code.data)) return onResult(code.data);
          }
          timer = window.setTimeout(look, 200);
        };
        look();
      } catch {
        if (alive) setError('The camera isn’t available here. Type the code instead.');
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [accept, onResult]);

  if (error) return <p className="rounded-2xl bg-sunken p-4 text-center text-[14px] text-ink-soft">{error}</p>;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
      <video ref={video} playsInline muted className="size-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80" aria-hidden />
    </div>
  );
}
