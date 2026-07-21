import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CIPRA — Convertidor de Píxeles a Rutas',
  description: 'Convierte imágenes en G-Code para brazo SCARA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
