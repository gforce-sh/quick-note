import { Suspense } from 'react';
import { Routing } from './Routing';

export const App = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Routing />;
    </Suspense>
  );
};
