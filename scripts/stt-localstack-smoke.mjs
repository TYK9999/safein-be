/*
 * Speech-to-text smoke test — runs the full flow (presign -> direct S3 PUT ->
 * start job -> poll -> transcript) against a RUNNING backend. Works against
 * LocalStack Pro (S3 + Transcribe on :4566) or real AWS; the backend, not this
 * script, decides which via its S3_ENDPOINT / TRANSCRIBE_ENDPOINT env.
 *
 * Prereqs (LocalStack Pro path):
 *   export LOCALSTACK_AUTH_TOKEN=<your token>
 *   docker compose --profile localstack up -d localstack
 *   aws --endpoint-url http://localhost:4566 s3 mb s3://safein-videos
 *   # start the app with the LocalStack overrides from .env.example, then:
 *   node scripts/stt-localstack-smoke.mjs
 *
 * Env: API_BASE (default http://localhost:3000/api/v1), BEARER (optional).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ffmpegPath from 'ffmpeg-static';

const API = process.env.API_BASE ?? 'http://localhost:3000/api/v1';
const BEARER = process.env.BEARER ?? '';
const authHeaders = BEARER ? { Authorization: `Bearer ${BEARER}` } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeClip() {
  const dir = mkdtempSync(join(tmpdir(), 'safein-stt-'));
  const out = join(dir, 'memo.webm');
  // 2s of a tone as Opus/WebM — a real, decodable audio clip (content is a beep;
  // LocalStack's transcript is synthetic anyway, real AWS would transcribe silence-ish).
  execFileSync(ffmpegPath, [
    '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:a', 'libopus', '-f', 'webm', '-y', out,
  ]);
  const bytes = readFileSync(out);
  rmSync(dir, { recursive: true, force: true });
  return bytes;
}

async function jpost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  const clip = makeClip();
  console.log(`clip: ${clip.length} bytes (audio/webm;codecs=opus)`);

  const { s3Key, url } = await jpost('/stt/presign', {
    mime: 'audio/webm;codecs=opus',
    size: clip.length,
  });
  console.log('presigned:', s3Key);

  const put = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/webm;codecs=opus' },
    body: clip,
  });
  if (!put.ok) throw new Error(`S3 PUT -> ${put.status}`);
  console.log('uploaded to S3');

  const { jobId } = await jpost('/stt/jobs', { s3Key });
  console.log('job started:', jobId);

  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${API}/stt/jobs/${jobId}`, { headers: authHeaders });
    const job = await res.json();
    console.log(`  poll ${i}: ${job.status}`);
    if (job.status === 'completed') {
      console.log('\n=== TRANSCRIPT ===\n' + JSON.stringify(job.text));
      return;
    }
    if (job.status === 'failed') throw new Error(`job failed: ${job.error}`);
    await sleep(2000);
  }
  throw new Error('timed out waiting for the transcription job');
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e.message);
  process.exit(1);
});
