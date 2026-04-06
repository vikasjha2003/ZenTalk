import { type ReactElement } from 'react';

interface RootLayoutProps {
  children: ReactElement;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
