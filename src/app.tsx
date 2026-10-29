import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight, rowsInPageOrder } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestTable } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = readNight(config.runsDir, night);
    if (!digest) return c.notFound();
    const rows = rowsInPageOrder(digest.rows);
    if (rows.length === 0 && digest.badLines === 0) {
      return c.html(
        <Layout title={`digest ${night}`} lane={lane()}>
          <h1>digest {night}</h1>
          <p>nothing ran</p>
        </Layout>,
      );
    }
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestTable night={night} rows={rows} />
      </Layout>,
    );
  });

  return app;
}
