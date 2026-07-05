import { Suspense } from 'react';
import { Routing } from './components/Routing';

export const App = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Routing />;
    </Suspense>
  );
};
