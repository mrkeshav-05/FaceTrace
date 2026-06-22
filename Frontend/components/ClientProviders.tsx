"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
import type { ReactNode } from "react";
import { SocketProvider } from "@/contexts/SocketContext";
import { Toaster } from "sonner";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <SocketProvider>
        {children}
        <Toaster position="top-right" />
      </SocketProvider>
    </Provider>
  );
}
