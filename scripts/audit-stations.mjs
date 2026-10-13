import fs from 'node:fs';
import path from 'node:path';

// Clean & sanitize metadata tags (same logic as in src/utils/metadata.ts)
function decodeEntities(str) {
  return str
    .replace(/<br\s*\/?>/gi, ' - ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTrackTitle(raw) {
  const cleaned = decodeEntities(raw.replace(/\s+/g, ' ').trim());
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
      raw: cleaned,
    };
  }
  return {
    title: cleaned,
    raw: cleaned,
  };
}

// 1. Audio stream probe: tests HTTP response, content-type and first byte chunks
async function probeAudioStream(url) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'WavelyRadioAuditor/1.0',
        'Icy-MetaData': '1',
        'Range': 'bytes=0-16384',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const contentType = res.headers.get('content-type') || '';
    const icyMetaInt = res.headers.get('icy-metaint');
    const icyName = res.headers.get('icy-name');

    const isAudioType =
      contentType.includes('audio') ||
      contentType.includes('mpegurl') ||
      contentType.includes('octet-stream') ||
      contentType.includes('application/x-mpegurl');

    if (!res.ok && res.status !== 206) {
      return {
        alive: false,
        statusCode: res.status,
        error: `HTTP ${res.status} ${res.statusText}`,
        latency,
        contentType,
        headers: {},
      };
    }

    // Try reading the first chunk to ensure real stream data flows
    let bytesRead = 0;
    let rawIcyTitle = null;

    if (res.body) {
      const reader = res.body.getReader();
      try {
        const { value, done } = await reader.read();
        if (value) {
          bytesRead = value.length;
          // Check for ICY metadata in chunk if icy-metaint is present
          if (icyMetaInt) {
            const metaInt = parseInt(icyMetaInt, 10);
            if (value.length > metaInt) {
              const metaLenByte = value[metaInt];
              const metaLength = metaLenByte * 16;
              if (metaLength > 0 && value.length >= metaInt + 1 + metaLength) {
                const metaBytes = value.slice(metaInt + 1, metaInt + 1 + metaLength);
                const metaString = new TextDecoder().decode(metaBytes);
                const match = metaString.match(/StreamTitle='([^']*)';/);
                if (match && match[1]) {
                  rawIcyTitle = match[1];
                }
              }
            }
          }
        }
        await reader.cancel();
      } catch (readErr) {
        // stream cancel is normal
      }
    }

    return {
      alive: bytesRead > 0 || isAudioType,
      statusCode: res.status,
      latency,
      contentType,
      bytesRead,
      icyName,
      rawIcyTitle,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    return {
      alive: false,
      statusCode: null,
      error: err.name === 'AbortError' ? 'Zaman Aşımı (Timeout > 6s)' : err.message,
      latency,
      contentType: null,
    };
  }
}

// 2. Metadata probe: attempts Icecast / Shoutcast / Triton lookup
async function probeMetadata(streamUrl, stationName) {
  const parsed = new URL(streamUrl);
  const origin = `${parsed.protocol}//${parsed.host}`;

  // Triton Digital Check
  try {
    let tritonMount = null;
    const lower = (stationName + ' ' + streamUrl).toLowerCase();
    if (lower.includes('super fm') || lower.includes('super_fm')) tritonMount = 'SUPER_FM';
    else if (lower.includes('virgin radio') || lower.includes('virgin_radio')) tritonMount = 'VIRGIN_RADIO';
    else if (lower.includes('joy türk') || lower.includes('joy_turk')) tritonMount = 'JOY_TURK';
    else if (lower.includes('metro fm') || lower.includes('metro_fm')) tritonMount = 'METRO_FM';

    if (tritonMount) {
      const tritonUrl = `https://np.tritondigital.com/public/nowplaying?mountName=${tritonMount}&numberToFetch=1&eventType=track`;
      const tRes = await fetch(tritonUrl, { signal: AbortSignal.timeout(3000) });
      if (tRes.ok) {
        const xml = await tRes.text();
        const artistMatch = xml.match(/<property name="cue_title"><!\[CDATA\[(.*?)\]\]><\/property>/i);
        const titleMatch = xml.match(/<property name="track_artist_name"><!\[CDATA\[(.*?)\]\]><\/property>/i);
        if (titleMatch && artistMatch) {
          return `${titleMatch[1]} - ${artistMatch[1]}`;
        }
      }
    }
  } catch {}

  // Icecast status-json.xsl Check
  try {
    const icecastUrl = `${origin}/status-json.xsl`;
    const res = await fetch(icecastUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const sources = data?.icestats?.source;
      const list = Array.isArray(sources) ? sources : sources ? [sources] : [];
      const match = list.find((s) => s.listenurl?.includes(parsed.pathname)) || list[0];
      const title = match?.title || match?.yp_currently_playing;
      if (title && typeof title === 'string' && title.trim().length > 1) {
        return title.trim();
      }
    }
  } catch {}

  // Shoutcast 7.html Check
  try {
    const shoutcastUrl = `${origin}/7.html`;
    const res = await fetch(shoutcastUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const html = await res.text();
      const parts = html.split(',');
      if (parts.length >= 7 && parts[6].trim().length > 1) {
        return parts.slice(6).join(',').replace(/<\/?[^>]+(>|$)/g, '').trim();
      }
    }
  } catch {}

  return null;
}

// 3. Main Audit Runner
async function runAudit() {
  console.log('\n============================================================');
  console.log('📻  WAVELY CANLI RADYO & METADATA SAĞLIK DENETİMİ (AUDIT)');
  console.log('============================================================');
  console.log('📡 İstasyonlar taranıyor: Ses akışı, çalan şarkı ve <br> analizi...\n');

  // List of prominent Turkish stations to audit
  const stationsToTest = [
    { name: 'DAMAR TÜRK FM', url: 'https://live.radyositesihazir.com:10997/' },
    { name: 'Arabesk FM', url: 'http://yayin.arabeskfm.biz:8042/;stream.mp3' },
    { name: 'Alem FM', url: 'https://turkmedya.radyotvonline.net/alemfmaac' },
    { name: 'Kral FM', url: 'https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8' },
    { name: 'Slow Türk', url: 'https://radyo.duhnet.tv/ak_dtvh_slowturk' },
    { name: 'Süper FM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC' },
    { name: 'Virgin Radio TR', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_SC' },
    { name: 'Joy Türk', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC' },
    { name: 'Metro FM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC' },
    { name: 'Kral Pop', url: 'https://dygedge2.radyotvonline.net/kralpop/playlist.m3u8' },
    { name: 'Radyo Fenomen', url: 'https://fenomenturk.listenfenomen.com/fenomenturk/128/icecast.audio' },
    { name: 'Power FM', url: 'https://listen.powerapp.com.tr/powerfm/mpeg/icecast.audio' },
    { name: 'Bozuk Test İstasyonu (Örnek 404)', url: 'https://stream.invalid-radio-domain-test.xyz:8000/live' }
  ];

  const results = [];
  let aliveCount = 0;
  let deadCount = 0;
  let hasTrackCount = 0;
  let hadBrTagsCount = 0;

  for (const station of stationsToTest) {
    process.stdout.write(`⏳ Denetleniyor: ${station.name.padEnd(25)} ... `);
    const audioRes = await probeAudioStream(station.url);

    let rawTrack = audioRes.rawIcyTitle || null;
    if (!rawTrack) {
      rawTrack = await probeMetadata(station.url, station.name);
    }

    let parsedTrack = null;
    let hadBrTags = false;
    let cleanStatus = 'Yok';

    if (rawTrack) {
      hasTrackCount++;
      hadBrTags = /<br\s*\/?>/i.test(rawTrack) || /&[a-z0-9#]+;/i.test(rawTrack);
      if (hadBrTags) hadBrTagsCount++;

      parsedTrack = parseTrackTitle(rawTrack);
      const remainingTags = /<[^>]*>/i.test(parsedTrack.raw);
      cleanStatus = remainingTags ? '❌ Bozuk HTML Kaldı' : hadBrTags ? '🧹 <br> Temizlendi' : '✨ Temiz';
    }

    if (audioRes.alive) {
      aliveCount++;
      console.log(`🟢 CANLI (${audioRes.latency}ms)`);
    } else {
      deadCount++;
      console.log(`🔴 ÖLÜ (${audioRes.error || 'Bağlantı Yok'})`);
    }

    results.push({
      station: station.name,
      url: station.url,
      alive: audioRes.alive,
      latencyMs: audioRes.latency,
      statusCode: audioRes.statusCode,
      error: audioRes.error || null,
      contentType: audioRes.contentType,
      rawTrack: rawTrack || null,
      cleanedTrack: parsedTrack ? `${parsedTrack.artist ? parsedTrack.artist + ' - ' : ''}${parsedTrack.title}` : null,
      hadBrTags,
      cleanStatus,
    });
  }

  // Print Formatted Report Table
  console.log('\n========================================================================================');
  console.log('📋  DENETİM SONUÇLARI RAPORU');
  console.log('========================================================================================');
  console.log(
    'İstasyon'.padEnd(20) +
    ' | Ses Durumu'.padEnd(16) +
    ' | Çalan Şarkı'.padEnd(35) +
    ' | HTML / <br> Durumu'
  );
  console.log('-'.repeat(90));

  for (const r of results) {
    const audioLabel = r.alive ? `🟢 CANLI (${r.latencyMs}ms)` : `🔴 ÖLÜ (${r.error?.slice(0, 10)})`;
    const trackLabel = r.cleanedTrack ? r.cleanedTrack.slice(0, 32) : '⚠️ (Metadata Yok)';
    console.log(
      r.station.slice(0, 18).padEnd(20) +
      ' | ' + audioLabel.padEnd(14) +
      ' | ' + trackLabel.padEnd(33) +
      ' | ' + r.cleanStatus
    );
  }

  console.log('-'.repeat(90));
  console.log(`\n📊 GENEL ÖZET:`);
  console.log(`  • Toplam Denetlenen: ${stationsToTest.length} İstasyon`);
  console.log(`  • 🟢 Canlı Ses Akışı:  ${aliveCount} adet`);
  console.log(`  • 🔴 Ölü / Çevrimdışı: ${deadCount} adet (Örn. 404 / Zaman Aşımı yakalandı)`);
  console.log(`  • 🎵 Çalan Şarkı Aktif: ${hasTrackCount} adet`);
  console.log(`  • 🧹 <br> / Entity İçeren: ${hadBrTagsCount} adet (Parser tarafından otomatik temizlendi)\n`);

  // Save JSON report
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'stream-audit-latest.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`💾 Detaylı JSON raporu kaydedildi: reports/stream-audit-latest.json\n`);
}

runAudit();
