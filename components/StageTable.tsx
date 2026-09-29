import { engine, stageNotes } from "@/lib/content";
import { formatInr, plans } from "@/lib/plans";

export function StageTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Engine stage</th>
            {plans.map((p) => (
              <th key={p.id} scope="col">{p.name}</th>
            ))}
          </tr>
        </thead>
        {engine.map((phase) => (
          <tbody key={phase.slug}>
            <tr className="phase-row">
              <th scope="rowgroup" colSpan={plans.length + 1}>{phase.title}</th>
            </tr>
            {phase.stages.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                {plans.map((p) => {
                  const on = s.tiers.includes(p.id);
                  const note = stageNotes[s.name]?.[p.id];
                  return (
                    <td key={p.id} className={on ? "yes" : "no"}>
                      {on ? note || "Included" : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
        <tbody>
          <tr className="phase-row"><th scope="rowgroup" colSpan={plans.length + 1}>Volume and languages</th></tr>
          <tr>
            <td>Videos per month</td>
            {plans.map((p) => <td key={p.id} className="yes">{p.volume}</td>)}
          </tr>
          <tr>
            <td>Languages included</td>
            {plans.map((p) => <td key={p.id} className="yes">{p.languages}</td>)}
          </tr>
          <tr>
            <td>Each extra language</td>
            {plans.map((p) => <td key={p.id} className="yes">+{formatInr(p.extraLanguageInr)}/mo</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
