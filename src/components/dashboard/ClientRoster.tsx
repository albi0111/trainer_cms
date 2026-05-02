import { useEffect, useState } from 'react';
import './ClientRoster.css';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import useStaggeredEntrance from '../../hooks/useStaggeredEntrance';
import type { ClientStatus } from '../../types';
import { toClientBadgeStatus } from '../../utils/clientStatus';

interface Client {
  id: string;
  name: string;
  goal: string;
}

interface ClientRosterProps {
  clients: Client[];
  clientDataMap: Record<string, { status: ClientStatus; nextSession: string }>;
  loading: boolean;
  onClientPress: (clientId: string) => void;
  onAddClient: () => void;
}

let hasPlayedInitialRosterEntrance = false;

function AnimatedClientList({
  clients,
  clientDataMap,
  onClientPress,
  filterKey,
}: {
  clients: Client[];
  clientDataMap: Record<string, { status: ClientStatus; nextSession: string }>;
  onClientPress: (clientId: string) => void;
  filterKey: string;
}) {
  const isFilterActive = filterKey.length > 0;
  const entrance = useStaggeredEntrance({
    itemCount: isFilterActive
      ? clients.length
      : (hasPlayedInitialRosterEntrance ? 0 : clients.length),
    baseDelay: isFilterActive ? 25 : 40,
    duration: isFilterActive ? 200 : 350,
  });

  useEffect(() => {
    if (!isFilterActive && clients.length > 0) {
      hasPlayedInitialRosterEntrance = true;
    }
  }, [clients.length, isFilterActive]);

  return (
    <>
      {clients.map((client, index) => {
        const state = clientDataMap[client.id] || { status: 'active', nextSession: 'no upcoming sessions' };
        const itemProps = entrance.getItemProps(index);

        return (
          <div
            key={client.id}
            className={`client-card-item ${itemProps.className}`}
            style={itemProps.style}
            onClick={() => onClientPress(client.id)}
          >
            <Avatar name={client.name} size="md" variant="dark" />
            <div className="client-card-item__info">
              <h4 className="client-card-item__name">{client.name}</h4>
              <p className="client-card-item__goal">{client.goal || 'General Fitness'}</p>
              <div className="client-card-item__next">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: state.status === 'active' ? 'var(--color-primary)' : 'var(--color-text-label)' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="client-card-item__next-text">{state.nextSession}</span>
              </div>
            </div>
            <div className="client-card-item__actions">
              <Badge variant={toClientBadgeStatus(state.status)} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-label)' }}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function ClientRoster({
  clients,
  clientDataMap,
  loading,
  onClientPress,
  onAddClient,
}: ClientRosterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const addClientGlyphs = (
    <span className="roster-add-btn__glyphs" aria-hidden="true">
      <span className="roster-add-btn__plus">+</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </span>
  );

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filterKey = searchQuery.trim().toLowerCase();

  return (
    <div className="client-roster">
      <div className="client-roster__search-row">
        <div className="roster-search">
          <svg className="roster-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            className="roster-search__input"
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="primary" 
          onClick={onAddClient}
          className="roster-add-btn"
          icon={addClientGlyphs}
          aria-label="Add client"
        >
          <span className="roster-add-btn__label">Add Client</span>
        </Button>
      </div>

      <div className="client-roster__count">{filtered.length} clients</div>

      {loading ? (
        <div className="client-roster__loading">
          <div className="spinner" />
        </div>
      ) : (
        <div className="roster-list">
          {filtered.length === 0 ? (
            <EmptyState message="No clients found." />
          ) : (
            <AnimatedClientList
              key={filterKey || '__default__'}
              clients={filtered}
              clientDataMap={clientDataMap}
              onClientPress={onClientPress}
              filterKey={filterKey}
            />
          )}
        </div>
      )}
    </div>
  );
}
