'use client';
import { Toaster } from 'react-hot-toast';
export default function ToastProvider() {
  return (
    <div className="hide-on-print">
      <Toaster position="bottom-left" containerClassName="hide-on-print" />
    </div>
  );
}