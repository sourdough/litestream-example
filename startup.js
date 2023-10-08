/*

run locally with:
SQLITE_PATH=/tmp/data.db && LSSQLITE_REPLICA_URL='gcs://jimmont-sqlite-litestream/data.db' && deno run -A --unstable startup.js

ref
https://litestream.io/guides/docker/
https://litestream.io/guides/gcs/
https://github.com/steren/litestream-cloud-run-example
https://github.com/denodrivers/sqlite3/blob/main/doc.md
 * */
import { pafs, Database, exists } from "./deps.js";

const { SQLITE_PATH = './PATH', LSSQLITE_REPLICA_URL = 'gcs://BUCKET/PATH' } = Deno.env.toObject();
async function _setupSqlite(path, url){
	console.log(`startup.js setup sqlite "${ path }" "${ url }"`);

	try{
		if(true === await exists(path)){
			// restore on startup
			await Deno.remove(path);
		}

		const dir = pafs.dirname(path);
		if(false === await exists(dir)){
			await Deno.mkdir( dir, {recursive:true} );
		};

		// creates db, if replica exists
		let cmd = new Deno.Command("litestream", { args: ['restore', '-v', '-if-replica-exists', '-o', path, url] });
		await cmd.output();

	}catch(error){
		console.log(`startup.js setup failed "${error?.message ?? error}"`, {error});
	}
}

await _setupSqlite(SQLITE_PATH, LSSQLITE_REPLICA_URL);

const litestream = new Deno.Command("litestream", { args: ['replicate', SQLITE_PATH, LSSQLITE_REPLICA_URL] });
const child = litestream.spawn();

const db = new Database(SQLITE_PATH);
db.exec('PRAGMA synchronous = NORMAL');
db.exec('PRAGMA wal_autocheckpoint = 0');
/*
db.exec(`CREATE TABLE IF NOT EXISTS n_time_table (id INTEGER PRIMARY KEY AUTOINCREMENT, n NUMERIC DEFAULT 0, t TEXT DEFAULT "");`);
*/
globalThis.db = db;
const controller = new AbortController();
globalThis.controller = controller;

Deno.addSignalListener('SIGTERM', () => {
	// gcr sends sigterm on container shutdown (no traffic, etc)
	console.log("...shutdown. sigterm. (cloud)");
	controller.abort();
	Deno.exit();
});
Deno.addSignalListener("SIGINT", () => {
	// ^c from terminal in local development
	console.log("...shutdown. sigint. (dev)");
	controller.abort();
	Deno.exit();
});

await import('./http.js');

