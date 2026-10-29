import type { DigestRow } from '../digest/types.js';

const EM = '—';

export function DigestTable({ night, rows }: { night: string; rows: DigestRow[] }) {
  return (
    <>
      <h1>digest {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first time</th>
            <th>last time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr class={row.retries >= 3 || row.lastStatus === 'fail' ? 'warn' : undefined}>
              <td>{row.job}</td>
              <td>{row.owner ?? EM}</td>
              <td>{row.runs}</td>
              <td>{row.retries}</td>
              <td>{row.lastStatus}</td>
              <td>{row.lastError ?? EM}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
