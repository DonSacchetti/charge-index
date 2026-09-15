import { Card } from "@/components/CoachShell";
import { IDEAL_ACTIVITY, type IdealHour } from "@/lib/coach-analysis";
import { formatHour } from "@/lib/slots";

/** The prototype's "Ideal day": each waking hour matched to an activity type. */
export function IdealDayCard({ day }: { day: IdealHour[] }) {
  return (
    <Card>
      <h2 className="mb-1 text-[10px] font-extrabold tracking-[0.13em] text-muted uppercase">Ideal day</h2>
      <p className="mb-[10px] text-[11.5px] leading-normal text-muted">Averaged across the tracked days.</p>
      <ol className="m-0 flex list-none flex-col gap-[3px] p-0">
        {day.map(({ hour, zone }) => {
          const a = IDEAL_ACTIVITY[zone];
          return (
            <li
              key={hour}
              className="flex items-center gap-[10px] rounded-[8px] px-[11px] py-[6px]"
              style={{ background: a.bg }}
            >
              <span className="w-[62px] flex-none text-[11.5px] font-extrabold text-navy">{formatHour(hour)}</span>
              <span className="flex-1 text-[12px] font-bold" style={{ color: a.fg }}>
                {a.task}
              </span>
              <span
                className="flex-none rounded-[10px] px-[7px] py-[2px] text-[9.5px] font-extrabold text-white"
                style={{ background: a.badgeBg }}
              >
                {a.badge}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
