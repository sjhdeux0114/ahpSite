'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, QrCode } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function QrCodeModal({ isOpen, onClose, title, url }: QrCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgStr, setSvgStr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !url) return;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setDataUrl)
      .catch(err => console.error('QR generation error:', err));

    QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setSvgStr)
      .catch(err => console.error('QR SVG error:', err));
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title.replace(/[^\w가-힣-]+/g, '_')}_QR.png`;
    a.click();
  };

  const handleDownloadSvg = () => {
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${title.replace(/[^\w가-힣-]+/g, '_')}_QR.svg`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">설문 QR 코드</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-5 border border-slate-200">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="설문 QR 코드"
              className="w-48 h-48 rounded-xl bg-white p-2 shadow-xs border border-slate-100"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
              QR 생성 중...
            </div>
          )}
          <div className="mt-3 w-full flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] text-slate-600 truncate flex-1">{url}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '복사'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!dataUrl}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG 저장</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!svgStr}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
}
