import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NotePlatform } from './NotePlatform';

export const Routing = ({ onLogout }: { onLogout: () => Promise<void> }) => (
  <BrowserRouter basename="/quick-note">
    <Routes>
      <Route path="/n/:id" element={<NotePlatform onLogout={onLogout} />} />
      <Route path="*" element={<NotePlatform onLogout={onLogout} />} />
    </Routes>
  </BrowserRouter>
);
