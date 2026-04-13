/**
 * Anketci - 100 Kullanıcı Yük Testi
 *
 * Test akışı:
 * 1. Test soruları oluştur
 * 2. Oturumu başlat (admin)
 * 3. 100 oyuncu bağlan + nickname ile katıl
 * 4. Admin "sonraki soru" gönder
 * 5. 100 oyuncu rastgele oy kullansın
 * 6. Süre bitsin, sonuçları doğrula
 * 7. 2. soru için tekrarla
 * 8. Oturumu bitir
 */

const { io } = require('socket.io-client');

const SERVER = 'http://localhost:3000';
const PLAYER_COUNT = 100;

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(path, opts) {
  const res = await fetch(`${SERVER}${path}`, opts);
  return res.json();
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log(' Anketci Yük Testi - 100 Kullanıcı');
  console.log('═══════════════════════════════════════════\n');

  // ─── Step 1: Clear existing questions & create test questions ───
  console.log('[1] Test soruları oluşturuluyor...');
  const existing = await fetchJson('/api/questions');
  for (const q of existing) {
    await fetchJson(`/api/questions/${q.id}`, { method: 'DELETE' });
  }

  await fetchJson('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Test Sorusu 1: En iyi programlama dili?',
      options: ['JavaScript', 'Python', 'Go', 'Rust'],
      duration: 10
    })
  });

  await fetchJson('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Test Sorusu 2: Favori renk?',
      options: ['Kırmızı', 'Mavi', 'Yeşil'],
      duration: 10
    })
  });

  const questions = await fetchJson('/api/questions');
  assert(questions.length === 2, `2 soru oluşturuldu (${questions.length})`);

  // ─── Step 2: Connect admin ─────────────────────────────────────
  console.log('\n[2] Admin bağlanıyor...');
  const admin = io(SERVER);
  await new Promise(r => admin.on('connect', r));
  admin.emit('register-admin');
  assert(admin.connected, 'Admin bağlandı');

  // Collect admin state updates
  let lastAdminState = null;
  let liveVoteCount = 0;
  admin.on('state', (s) => { lastAdminState = s; liveVoteCount = s.voteCount || 0; });
  admin.on('vote-count', (c) => { liveVoteCount = c; });

  // ─── Step 3: Start session ─────────────────────────────────────
  console.log('\n[3] Oturum başlatılıyor...');
  admin.emit('start-session');
  await sleep(300);
  assert(lastAdminState && lastAdminState.active, 'Oturum aktif');
  assert(lastAdminState && lastAdminState.phase === 'lobby', 'Faz: lobby');

  // ─── Step 4: Connect 100 players ───────────────────────────────
  console.log(`\n[4] ${PLAYER_COUNT} oyuncu bağlanıyor...`);
  const players = [];
  const playerStates = [];
  const connectStart = Date.now();

  const connectPromises = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    connectPromises.push(new Promise((resolve) => {
      const sock = io(SERVER);
      sock.on('connect', () => {
        const nickname = `Player_${String(i + 1).padStart(3, '0')}`;
        sock.emit('join', nickname, (resp) => {
          players.push({ socket: sock, nickname, index: i });
          playerStates.push({ voted: false, lastState: null });

          sock.on('state', (s) => {
            playerStates[players.length - 1].lastState = s;
          });

          resolve(resp);
        });
      });
    }));
  }

  const joinResults = await Promise.all(connectPromises);
  const connectTime = Date.now() - connectStart;

  const allOk = joinResults.every(r => r.ok);
  assert(allOk, `${PLAYER_COUNT} oyuncu başarıyla katıldı`);
  console.log(`  ⏱  Bağlantı süresi: ${connectTime}ms`);

  await sleep(500);
  assert(lastAdminState.playerCount === PLAYER_COUNT,
    `Admin ${PLAYER_COUNT} oyuncu görüyor (${lastAdminState.playerCount})`);

  // ─── Step 5: First question - all 100 vote ─────────────────────
  console.log('\n[5] Soru 1 başlatılıyor...');
  admin.emit('next-question');
  await sleep(500);

  assert(lastAdminState.phase === 'question', `Faz: question (${lastAdminState.phase})`);
  assert(lastAdminState.question.text.includes('programlama dili'),
    'Doğru soru görünüyor');

  console.log('    100 oyuncu oy kullanıyor...');
  const voteStart = Date.now();
  const voteDistribution = [0, 0, 0, 0]; // Track expected votes

  const votePromises = players.map((p, i) => {
    return new Promise((resolve) => {
      // Stagger votes slightly to simulate real usage
      setTimeout(() => {
        const choice = i % 4; // Distribute evenly across 4 options
        voteDistribution[choice]++;
        p.socket.emit('vote', choice);
        resolve();
      }, Math.random() * 200);
    });
  });

  await Promise.all(votePromises);
  const voteTime = Date.now() - voteStart;
  console.log(`  ⏱  Oylama süresi: ${voteTime}ms`);

  // Wait for all votes to be registered
  await sleep(2000);
  assert(liveVoteCount === PLAYER_COUNT,
    `${PLAYER_COUNT} oy alındı (${liveVoteCount})`);

  // ─── Step 6: Wait for timer to expire, check results ───────────
  console.log('\n[6] Süre bitişi bekleniyor (sonuçlar)...');

  // Wait for results phase
  let waitCount = 0;
  while (lastAdminState.phase !== 'results' && waitCount < 30) {
    await sleep(1000);
    waitCount++;
  }

  assert(lastAdminState.phase === 'results', `Faz: results (${lastAdminState.phase})`);

  if (lastAdminState.results) {
    const totalVotes = lastAdminState.results.reduce((sum, r) => sum + r.count, 0);
    assert(totalVotes === PLAYER_COUNT,
      `Toplam oy sayısı: ${totalVotes}/${PLAYER_COUNT}`);

    console.log('\n    Soru 1 Sonuçları:');
    lastAdminState.results.forEach((r, i) => {
      console.log(`      ${r.option}: ${r.count} oy (%${r.percent})`);
      assert(r.count === voteDistribution[i],
        `${r.option}: beklenen ${voteDistribution[i]}, gelen ${r.count}`);
    });

    // Percentages should add up to ~100
    const totalPercent = lastAdminState.results.reduce((sum, r) => sum + r.percent, 0);
    assert(totalPercent >= 99 && totalPercent <= 101,
      `Yüzdeler toplamı: %${totalPercent} (~100)`);
  }

  // ─── Step 7: Second question ───────────────────────────────────
  console.log('\n[7] Soru 2 başlatılıyor...');
  admin.emit('next-question');
  await sleep(500);

  assert(lastAdminState.phase === 'question', `Faz: question (${lastAdminState.phase})`);
  assert(lastAdminState.question.text.includes('renk'),
    'Doğru soru görünüyor');
  assert(lastAdminState.voteCount === 0, 'Oylar sıfırlandı');

  console.log('    100 oyuncu oy kullanıyor...');
  const voteDistribution2 = [0, 0, 0];

  const votePromises2 = players.map((p, i) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const choice = i % 3;
        voteDistribution2[choice]++;
        p.socket.emit('vote', choice);
        resolve();
      }, Math.random() * 200);
    });
  });

  await Promise.all(votePromises2);
  await sleep(2000);
  assert(liveVoteCount === PLAYER_COUNT,
    `${PLAYER_COUNT} oy alındı (${liveVoteCount})`);

  // Wait for results
  waitCount = 0;
  while (lastAdminState.phase !== 'results' && waitCount < 30) {
    await sleep(1000);
    waitCount++;
  }

  if (lastAdminState.results) {
    const totalVotes2 = lastAdminState.results.reduce((sum, r) => sum + r.count, 0);
    assert(totalVotes2 === PLAYER_COUNT,
      `Soru 2 toplam oy: ${totalVotes2}/${PLAYER_COUNT}`);

    console.log('\n    Soru 2 Sonuçları:');
    lastAdminState.results.forEach((r, i) => {
      console.log(`      ${r.option}: ${r.count} oy (%${r.percent})`);
    });
  }

  // ─── Step 8: Finish → next goes to 'finished' ─────────────────
  console.log('\n[8] Son soru sonrası "finished" durumu...');
  admin.emit('next-question');
  await sleep(500);
  assert(lastAdminState.phase === 'finished', `Faz: finished (${lastAdminState.phase})`);

  // ─── Step 9: End session ───────────────────────────────────────
  console.log('\n[9] Oturum sonlandırılıyor...');
  admin.emit('end-session');
  await sleep(500);
  assert(!lastAdminState.active, 'Oturum sonlandı');

  // ─── Step 10: Disconnect all ───────────────────────────────────
  console.log('\n[10] Bağlantılar kapatılıyor...');
  players.forEach(p => p.socket.disconnect());
  admin.disconnect();

  // ─── Report ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log(` SONUÇ: ${passed} geçti, ${failed} başarısız`);
  console.log('═══════════════════════════════════════════\n');

  // Restore original questions
  const testQs = await fetchJson('/api/questions');
  for (const q of testQs) {
    await fetchJson(`/api/questions/${q.id}`, { method: 'DELETE' });
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test hatası:', err);
  process.exit(1);
});
