import { Suspense } from 'react';
import { Routing } from './components/Routing';
import { ThemeProvider } from './context/theme';

export const App = () => {
  return (
    <ThemeProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <Routing />;
      </Suspense>
    </ThemeProvider>
  );
};
