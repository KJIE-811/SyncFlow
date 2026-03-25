import { RouterProvider } from 'react-router';
import { router } from './routes';
import { IntegrationProvider } from './contexts/IntegrationContext';
import { AIProvider } from './contexts/AIContext';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <IntegrationProvider>
        <AIProvider>
          <RouterProvider router={router} />
          <Toaster 
            position="top-right" 
            theme="dark"
            toastOptions={{
              style: {
                background: '#1E293B',
                color: '#E5E7EB',
                border: '1px solid #374151',
              },
            }}
          />
        </AIProvider>
      </IntegrationProvider>
    </AuthProvider>
  );
}