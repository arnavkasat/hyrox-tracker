import { PlanView } from "./plan-view";
import { Screen } from "@/components/ios/screen";
import { getAllSessions, getAppContext } from "@/lib/data/queries";
import { diffDays } from "@/lib/date";

export default async function PlanPage() {
  const { supabase, user, settings, today } = await getAppContext();
  const sessions = await getAllSessions(supabase, user.id);

  const completed = sessions.filter((s) => s.status === "completed").length;
  const weeksLeft = Math.max(0, Math.ceil(diffDays(today, settings.race_date) / 7));

  return (
    <Screen
      title="Plan"
      subtitle={`${completed} of ${sessions.length} sessions done · ${weeksLeft} weeks to go`}
    >
      <PlanView sessions={sessions} today={today} />
    </Screen>
  );
}
