import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime:    1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: '13px',
            background: 'hsl(120 10% 8%)',
            border: '1px solid hsl(120 8% 16%)',
            color: 'hsl(120 10% 91%)',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);
