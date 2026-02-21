#!/usr/bin/env npx tsx
/**
 * TX RRC ingest v2 - downloads by SYMNUM type to avoid timeouts
 */
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';
import * as fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://gis.rrc.texas.gov/server/rest/services/rrc_public/RRC_Public_Viewer_Srvs/MapServer/1/query';
const BATCH = 2000;
const CACHE = '/tmp/tx_rrc_wells.json';

function dUUID(ns: string, key: string): string {
  const h = createHash('sha256').update(`${ns}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

const TX_COUNTY_FIPS: Record<string, string> = {"001":"Anderson","003":"Andrews","005":"Angelina","007":"Aransas","009":"Archer","011":"Armstrong","013":"Atascosa","015":"Austin","017":"Bailey","019":"Bandera","021":"Bastrop","023":"Baylor","025":"Bee","027":"Bell","029":"Bexar","031":"Blanco","033":"Borden","035":"Bosque","037":"Bowie","039":"Brazoria","041":"Brazos","043":"Brewster","045":"Briscoe","047":"Brooks","049":"Brown","051":"Burleson","053":"Burnet","055":"Caldwell","057":"Calhoun","059":"Callahan","061":"Cameron","063":"Camp","065":"Carson","067":"Cass","069":"Castro","071":"Chambers","073":"Cherokee","075":"Childress","077":"Clay","079":"Cochran","081":"Coke","083":"Coleman","085":"Collin","087":"Collingsworth","089":"Colorado","091":"Comal","093":"Comanche","095":"Concho","097":"Cooke","099":"Coryell","101":"Cottle","103":"Crane","105":"Crockett","107":"Crosby","109":"Culberson","111":"Dallam","113":"Dallas","115":"Dawson","117":"Deaf Smith","119":"Delta","121":"Denton","123":"DeWitt","125":"Dickens","127":"Dimmit","129":"Donley","131":"Duval","133":"Eastland","135":"Ector","137":"Edwards","139":"Ellis","141":"El Paso","143":"Erath","145":"Falls","147":"Fannin","149":"Fayette","151":"Fisher","153":"Floyd","155":"Foard","157":"Fort Bend","159":"Franklin","161":"Freestone","163":"Frio","165":"Gaines","167":"Galveston","169":"Garza","171":"Gillespie","173":"Glasscock","175":"Goliad","177":"Gonzales","179":"Gray","181":"Grayson","183":"Gregg","185":"Grimes","187":"Guadalupe","189":"Hale","191":"Hall","193":"Hamilton","195":"Hansford","197":"Hardeman","199":"Hardin","201":"Harris","203":"Harrison","205":"Hartley","207":"Haskell","209":"Hays","211":"Hemphill","213":"Henderson","215":"Hidalgo","217":"Hill","219":"Hockley","221":"Hood","223":"Hopkins","225":"Houston","227":"Howard","229":"Hudspeth","231":"Hunt","233":"Hutchinson","235":"Irion","237":"Jack","239":"Jackson","241":"Jasper","243":"Jeff Davis","245":"Jefferson","247":"Jim Hogg","249":"Jim Wells","251":"Johnson","253":"Jones","255":"Karnes","257":"Kaufman","259":"Kendall","261":"Kenedy","263":"Kent","265":"Kerr","267":"Kimble","269":"King","271":"Kinney","273":"Kleberg","275":"Knox","277":"Lamar","279":"Lamb","281":"Lampasas","283":"La Salle","285":"Lavaca","287":"Lee","289":"Leon","291":"Liberty","293":"Limestone","295":"Lipscomb","297":"Live Oak","299":"Llano","301":"Loving","303":"Lubbock","305":"Lynn","307":"McCulloch","309":"McLennan","311":"McMullen","313":"Madison","315":"Marion","317":"Martin","319":"Mason","321":"Matagorda","323":"Maverick","325":"Medina","327":"Menard","329":"Midland","331":"Milam","333":"Mills","335":"Mitchell","337":"Montague","339":"Montgomery","341":"Moore","343":"Morris","345":"Motley","347":"Nacogdoches","349":"Navarro","351":"Newton","353":"Nolan","355":"Nueces","357":"Ochiltree","359":"Oldham","361":"Orange","363":"Palo Pinto","365":"Panola","367":"Parker","369":"Parmer","371":"Pecos","373":"Polk","375":"Potter","377":"Presidio","379":"Rains","381":"Randall","383":"Reagan","385":"Real","387":"Red River","389":"Reeves","391":"Refugio","393":"Roberts","395":"Robertson","397":"Rockwall","399":"Runnels","401":"Rusk","403":"Sabine","405":"San Augustine","407":"San Jacinto","409":"San Patricio","411":"San Saba","413":"Schleicher","415":"Scurry","417":"Shackelford","419":"Shelby","421":"Sherman","423":"Smith","425":"Somervell","427":"Starr","429":"Stephens","431":"Sterling","433":"Stonewall","435":"Sutton","437":"Swisher","439":"Tarrant","441":"Taylor","443":"Terrell","445":"Terry","447":"Throckmorton","449":"Titus","451":"Tom Green","453":"Travis","455":"Trinity","457":"Tyler","459":"Upshur","461":"Upton","463":"Uvalde","465":"Val Verde","467":"Van Zandt","469":"Victoria","471":"Walker","473":"Waller","475":"Ward","477":"Washington","479":"Webb","481":"Wharton","483":"Wheeler","485":"Wichita","487":"Wilbarger","489":"Willacy","491":"Williamson","493":"Wilson","495":"Winkler","497":"Wise","499":"Wood","501":"Yoakum","503":"Young","505":"Zapata","507":"Zavala"};

const TX_BASIN: Record<string, string> = {"Midland":"Midland Basin","Martin":"Midland Basin","Howard":"Midland Basin","Glasscock":"Midland Basin","Reagan":"Midland Basin","Upton":"Midland Basin","Crane":"Midland Basin","Ector":"Midland Basin","Andrews":"Midland Basin","Dawson":"Midland Basin","Borden":"Midland Basin","Scurry":"Midland Basin","Sterling":"Midland Basin","Irion":"Midland Basin","Tom Green":"Midland Basin","Gaines":"Permian Basin","Yoakum":"Permian Basin","Terry":"Permian Basin","Reeves":"Delaware Basin","Loving":"Delaware Basin","Ward":"Delaware Basin","Pecos":"Delaware Basin","Culberson":"Delaware Basin","Winkler":"Delaware Basin","Jeff Davis":"Delaware Basin","Webb":"Eagle Ford","La Salle":"Eagle Ford","Dimmit":"Eagle Ford","McMullen":"Eagle Ford","Atascosa":"Eagle Ford","Karnes":"Eagle Ford","DeWitt":"Eagle Ford","Gonzales":"Eagle Ford","Fayette":"Eagle Ford","Lavaca":"Eagle Ford","Live Oak":"Eagle Ford","Bee":"Eagle Ford","Maverick":"Eagle Ford","Zavala":"Eagle Ford","Frio":"Eagle Ford","Wilson":"Eagle Ford","Tarrant":"Barnett Shale","Johnson":"Barnett Shale","Wise":"Barnett Shale","Parker":"Barnett Shale","Denton":"Barnett Shale","Hood":"Barnett Shale","Somervell":"Barnett Shale","Erath":"Barnett Shale","Jack":"Barnett Shale","Palo Pinto":"Barnett Shale","Montague":"Barnett Shale","Harrison":"Haynesville","Panola":"Haynesville","Rusk":"Haynesville","Shelby":"Haynesville","San Augustine":"Haynesville","Nacogdoches":"Haynesville","Gregg":"East Texas Basin","Smith":"East Texas Basin","Cherokee":"East Texas Basin","Anderson":"East Texas Basin","Henderson":"East Texas Basin","Wood":"East Texas Basin","Upshur":"East Texas Basin","Van Zandt":"East Texas Basin","Hansford":"Anadarko Basin","Ochiltree":"Anadarko Basin","Lipscomb":"Anadarko Basin","Roberts":"Anadarko Basin","Hemphill":"Anadarko Basin","Wheeler":"Anadarko Basin","Gray":"Anadarko Basin","Carson":"Anadarko Basin","Hutchinson":"Anadarko Basin","Moore":"Anadarko Basin","Potter":"Anadarko Basin","Sherman":"Anadarko Basin","Dallam":"Anadarko Basin","Hartley":"Anadarko Basin","Oldham":"Anadarko Basin","Harris":"Gulf Coast","Galveston":"Gulf Coast","Brazoria":"Gulf Coast","Chambers":"Gulf Coast","Liberty":"Gulf Coast","Montgomery":"Gulf Coast","Fort Bend":"Gulf Coast","Wharton":"Gulf Coast","Matagorda":"Gulf Coast","Jackson":"Gulf Coast","Victoria":"Gulf Coast","Calhoun":"Gulf Coast","Refugio":"Gulf Coast","Aransas":"Gulf Coast","Nueces":"Gulf Coast","San Patricio":"Gulf Coast","Kleberg":"Gulf Coast","Jim Wells":"Gulf Coast","Duval":"Gulf Coast","Jim Hogg":"Gulf Coast","Starr":"Gulf Coast","Hidalgo":"Gulf Coast","Cameron":"Gulf Coast","Willacy":"Gulf Coast","Kenedy":"Gulf Coast","Brooks":"Gulf Coast","Colorado":"Gulf Coast","Austin":"Gulf Coast","Waller":"Gulf Coast","Orange":"Gulf Coast","Jefferson":"Gulf Coast","Hardin":"Gulf Coast"};

const SYM_MAP: Record<number, { status: string; type: string; commodity: string }> = {
  4: {status:'active',type:'oil',commodity:'crude oil'},
  5: {status:'active',type:'gas',commodity:'natural gas'},
  6: {status:'active',type:'oil',commodity:'crude oil'},
  19:{status:'shut-in',type:'oil',commodity:'crude oil'},
  20:{status:'shut-in',type:'gas',commodity:'natural gas'},
};

function countyFromAPI(api: string): string {
  if (!api || api.length < 5) return '';
  return TX_COUNTY_FIPS[api.substring(2, 5)] || '';
}

async function fetchType(symnum: number, label: string): Promise<any[]> {
  const WHERE = `SYMNUM = ${symnum}`;
  const countResp = await fetch(`${BASE_URL}?where=${encodeURIComponent(WHERE)}&returnCountOnly=true&f=json`);
  const { count } = await countResp.json();
  console.log(`  ${label}: ${count.toLocaleString()} wells`);
  
  const wells: any[] = [];
  let offset = 0;
  
  while (true) {
    const params = new URLSearchParams({
      where: WHERE,
      outFields: 'API,GIS_WELL_NUMBER,SYMNUM,GIS_LAT83,GIS_LONG83',
      f: 'json', resultOffset: String(offset), resultRecordCount: String(BATCH),
      orderByFields: 'OBJECTID ASC',
    });
    
    let data: any;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const resp = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(30000) });
        data = await resp.json();
        break;
      } catch (err) {
        console.warn(`    Retry ${attempt}/5 at offset ${offset}`);
        if (attempt === 5) throw err;
        await new Promise(r => setTimeout(r, 3000 * attempt));
      }
    }
    
    const features = (data.features || []).map((f: any) => f.attributes);
    if (features.length === 0) break;
    wells.push(...features);
    offset += features.length;
    
    if (offset % 50000 < BATCH) console.log(`    ${offset.toLocaleString()}...`);
    if (!data.exceededTransferLimit && features.length < BATCH) break;
  }
  
  return wells;
}

async function main() {
  console.log('TX RRC Well Ingestion v2\n');
  
  let allWells: any[];
  
  if (fs.existsSync(CACHE)) {
    console.log('Loading from cache...');
    allWells = JSON.parse(fs.readFileSync(CACHE, 'utf-8'));
    console.log(`Loaded ${allWells.length.toLocaleString()} wells\n`);
  } else {
    allWells = [];
    // Download each type separately to avoid timeout on huge queries
    for (const [sym, label] of [[4,'Oil Wells'],[5,'Gas Wells'],[6,'Oil/Gas Wells'],[19,'Shut-in Oil'],[20,'Shut-in Gas']] as [number,string][]) {
      const wells = await fetchType(sym, label);
      for (const w of wells) allWells.push(w);
    }
    console.log(`\nTotal: ${allWells.length.toLocaleString()} wells`);
    fs.writeFileSync(CACHE, JSON.stringify(allWells));
    console.log(`Cached to ${CACHE}\n`);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  try {
    // Clean TX data
    await client.query(`DELETE FROM financial_estimates WHERE asset_id IN (SELECT id FROM assets WHERE state = 'TX')`);
    await client.query(`DELETE FROM production_records WHERE asset_id IN (SELECT id FROM assets WHERE state = 'TX')`);
    const { rowCount: del } = await client.query(`DELETE FROM assets WHERE state = 'TX'`);
    console.log(`Cleaned ${del} old TX assets\n`);

    console.log(`Inserting ${allWells.length.toLocaleString()} wells...`);
    let inserted = 0, skipped = 0;
    const CHUNK = 200;
    const seen = new Set<string>();

    for (let i = 0; i < allWells.length; i += CHUNK) {
      const chunk = allWells.slice(i, i + CHUNK);
      const vals: string[] = [], params: any[] = [];
      let pi = 1;

      for (const w of chunk) {
        const api = w.API || '';
        if (!api || api.length < 5) { skipped++; continue; }
        const id = dUUID('tx_well', `${api}_${w.GIS_WELL_NUMBER || ''}`);
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        const sym = SYM_MAP[w.SYMNUM] || {status:'active',type:'oil',commodity:'crude oil'};
        const county = countyFromAPI(api);
        const basin = TX_BASIN[county] || null;
        const name = `${county || 'TX'} Well ${api}-${w.GIS_WELL_NUMBER || ''}`.trim();

        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9})`);
        params.push(id, sym.type, name, 'TX', county, w.GIS_LAT83||0, w.GIS_LONG83||0, basin, sym.status, sym.commodity);
        pi += 10;
      }

      if (vals.length > 0) {
        await client.query(`
          INSERT INTO assets (id,asset_type,name,state,county,latitude,longitude,basin,status,commodity)
          VALUES ${vals.join(',')}
          ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,basin=EXCLUDED.basin
        `, params);
        inserted += vals.length;
      }
      if (inserted % 20000 < CHUNK) console.log(`  ${inserted.toLocaleString()}...`);
    }

    console.log(`\n✓ ${inserted.toLocaleString()} inserted (${skipped.toLocaleString()} skipped)`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,'TX_RRC_GIS',$2,$3,'success',$4)`,
      [randomUUID(), BASE_URL, inserted, `${inserted} active/shut-in wells from TX RRC GIS`]);

    const { rows: [s] } = await client.query(`SELECT count(*) AS t, count(*) FILTER (WHERE status='active') AS a, count(*) FILTER (WHERE status='shut-in') AS si FROM assets WHERE state='TX'`);
    console.log(`\nTX: ${s.t} total, ${s.a} active, ${s.si} shut-in`);

    const { rows: bb } = await client.query(`SELECT basin,count(*)::int AS c FROM assets WHERE state='TX' AND basin IS NOT NULL GROUP BY basin ORDER BY c DESC LIMIT 8`);
    console.log('\nBasins:'); bb.forEach((r:any) => console.log(`  ${r.basin}: ${r.c.toLocaleString()}`));

    const { rows: ov } = await client.query(`SELECT state,count(*)::int AS c FROM assets GROUP BY state ORDER BY c DESC`);
    let tot = 0;
    console.log('\n=== Platform ===');
    ov.forEach((r:any) => { console.log(`  ${r.state}: ${r.c.toLocaleString()}`); tot += r.c; });
    console.log(`  TOTAL: ${tot.toLocaleString()}`);
    console.log('\n✅ Done!');
  } finally { await client.end(); }
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
