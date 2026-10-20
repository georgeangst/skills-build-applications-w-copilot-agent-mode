import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Team = { name: string; members: string[] };

const loadTeams = async () => (await getJson<{ teams: Team[] }>('/api/teams')).teams;

export default function Teams() {
  return <CapabilityCard
    title="Teams"
    description="Manage teams and members."
    emptyText="No teams yet."
    load={loadTeams}
    renderItem={(team) => <><strong>{team.name}</strong> — Members: {team.members.join(', ') || 'None'}</>}
  />;
}
