"use client";

import { useEffect, useRef, useState } from "react";
import {Modal} from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { CameraOff } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetect: (code: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onDetect }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setError(null);
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        startDetection();
      } catch {
        setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      }
    };

    startCamera();
    return stopCamera;
  }, [isOpen]);

  const startDetection = () => {
    if (!("BarcodeDetector" in window)) {
      setError("Tu navegador no soporta escaneo nativo. Usa Chrome o Edge, o ingresa el código manualmente.");
      return;
    }

    // @ts-ignore — BarcodeDetector es API experimental
    const detector = new window.BarcodeDetector({
      formats: ["qr_code", "code_128", "code_39", "ean_13"],
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const scan = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          onDetect(barcodes[0].rawValue);
          stopCamera();
          onClose();
          return;
        }
      } catch {
        // Frame sin código, continuar
      }

      rafRef.current = requestAnimationFrame(scan);
    };

    rafRef.current = requestAnimationFrame(scan);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full m-4">
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 text-center">
          Escanear código del cupón
        </h3>

        {error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CameraOff className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Overlay de escaneo */}
            {ready && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Oscurecer bordes */}
                <div className="absolute inset-0 bg-black/40" />
                {/* Ventana de escaneo */}
                <div className="relative w-52 h-52 z-10">
                  <div className="absolute inset-0 border border-white/20 rounded-lg" />
                  {/* Esquinas */}
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-brand-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-brand-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-brand-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-brand-400 rounded-br-md" />
                  {/* Línea animada */}
                  <div className="absolute top-2 left-2 right-2 h-0.5 bg-brand-400/70 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
          {error ? "Ingresa el código manualmente en el campo de texto." : "Apunta la cámara al código QR o de barras del cupón."}
        </p>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
