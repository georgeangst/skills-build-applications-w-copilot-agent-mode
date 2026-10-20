import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Suggestion = { title: string; reason?: string };

const userEmail = 'mona@example.com';
const loadSuggestions = async () => (
  await getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
).suggestions;

export default function Workouts() {
  return <CapabilityCard
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyText="No workout suggestions yet."
    load={loadSuggestions}
    renderItem={(suggestion) => <><strong>{suggestion.title}</strong>{suggestion.reason && <> — {suggestion.reason}</>}</>}
  />;
}
