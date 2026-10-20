import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Ranking = { teamName: string; totalPoints: number; rank: number };

const loadLeaderboard = async () => (await getJson<{ leaderboard: Ranking[] }>('/api/leaderboard')).leaderboard;

export default function Leaderboard() {
  return <CapabilityCard
    title="Leaderboard"
    description="Compare team point totals."
    emptyText="No leaderboard scores yet."
    load={loadLeaderboard}
    renderItem={(ranking) => <><strong>#{ranking.rank} {ranking.teamName}</strong> — {ranking.totalPoints} points</>}
  />;
}
