// ─────────────────────────────────────────────────────────────────────────────
// Client Screen — placeholder
// Will be built in Phase 3
// ─────────────────────────────────────────────────────────────────────────────

import { useParams } from 'react-router-dom';

export default function ClientScreen() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="screen">
      <h1>Client</h1>
      <p>Client ID: {id}</p>
      <p>Phase 3 — coming soon</p>
    </div>
  );
}
