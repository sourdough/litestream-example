import { pafs, Database, Application, Router, HttpError, send, Status } from "./deps.js";

const version = '20231005.example';

const port = Deno.env.get('PORT') ?? 8080;
const userAgent = `app/${version} Deno/${Deno.version.deno} V8/${Deno.version.v8} TS/${Deno.version.typescript} ${Deno.build.target}`;
const www = {root: pafs.resolve(Deno.cwd(), './www/'), index: 'index.html'};
const charset = '; charset=utf-8';
const mimetypes = {
	css: `text/css${ charset }`
	,ico: `image/vnd.microsoft.icon`
	,jpg: `image/jpeg`
	,js: `text/javascript${ charset }`
	,json: `application/json${ charset }`
	,pdf: `application/pdf${ charset }`
	,txt: `text/plain${ charset }`
	,html: `text/html${ charset }`
	// application/csp-report as JSON
};

console.log(`http.js startup ${ port }`);

// startup sets up db on global
const { db = null } = globalThis;
if(!db) throw `db not available "${ db }"`;

// default expiration caching (minimum 1 second);
const expires = {
	normal: 'public, max-age=8, s-maxage=8'
	,fast: 'public, max-age=1, s-maxage=1'
}


const app = new Application();

// general error handling including unhandled middleware errors (500)
app.use(async ({response, request}, next) => {
	try{
		const {pathname} = request.url;
		await next();
	}catch(err){
		const status = err instanceof HttpError ? err.status : 500;
		// other middleware should do context.throw(123) or assert() to pass correct status
		response.status = status;
		log(status, request.method, request.url.href, request.user, request.headers.get('user-agent'), request.ip);
		// adjust response to fit requested mimetype
		let ext = request.url.pathname.split('?')[0].split('.').pop().toLowerCase();
		
		let type = mimetypes[ ext ] || mimetypes[ ( ext = request.url.pathname.startsWith('/api') ? 'json' : 'html' ) ];
		response.type = type;

		// short caches on errors
		response.headers.set('Cache-Control', expires.fast);

		const msg = (err.message || '').slice(0, 3000);

		if(err.expose){
			response.headers.set('X-appmsg', msg);
		};

		let message = Status[status] || 'server error';
		// send an appropriate response
		switch(ext){
		case 'html':
			response.body = `<!doctype html>
<html><body>
<p>${status} ${ message }</p>
<p>v${ version }</p>
</body></html>
`;
		break;
		case 'json':
			response.body = JSON.stringify({ status, error: message });
		break;
		default:
		response.body = '';
		}
	}
});

function log(status='000', VERB='GUESS', what='', who='?', client='~', where='...', other='-'){
	console.log(`${ (new Date).toISOString() } ${ status } "${ VERB } ${ what }" ${ who } "${ client }" ${ where } ${ other }`);
}

// LAST log, common headers, etc
app.use(async (context, next) => {
	const start = Date.now();
	await next();

	const time = `${ Date.now() - start }ms`;
	const { request, response } = context;
	response.headers.set('X-Response-Time', time);
	response.headers.set('Cache-Control', expires.normal);
	const auth = request.headers.get('Authorization');
	log(response.status, request.method, request.url, request.user, request.headers.get('user-agent'), request.ip, time);
});

const rout = new Router();
rout
.get('/',(context)=>{
	context.response.body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" >
</head>
<body>
<p>hi.</p>
</body></html>
	`;
})
.get('/pt', (context)=>{
	const n = Date.now();
	const t = new Date(n).toISOString();
	try{
		const body = db.exec("INSERT INTO n_time_table(n,t) VALUES (?, ?)", n, t);
		context.response.body = JSON.stringify({n, t, body});
	}catch(error){
		console.log(`sqlite error /pt`,error);
		context.response.body = JSON.stringify({n, t, error: error?.message ?? error});
	}
})
.get('/pts', (context)=>{
	try{
		let sql = db.prepare("select * from n_time_table LIMIT 100");
		const body = sql.all(); // .values(...params);
		sql = db.prepare("SELECT COUNT(*) FROM n_time_table");
		const [count=0] = sql.value();

		context.response.body = JSON.stringify({count, body});
	}catch(error){
		console.log(`sqlite error /pts`,error);
		context.response.body = JSON.stringify({error});
	}
})
;

app.use(rout.routes());
app.use(rout.allowedMethods());

/* static content */
app.use(async context => {
	await send(context, context.request.url.pathname, www);
});

app.addEventListener('error', (event)=>{
	log('000', 'ERROR', `${ event.error }`, undefined, userAgent);
});
app.addEventListener('listen', (server)=>{
	log('000', 'START', `${ server.secure ? 'https':'http' }://${ server.hostname || 'localhost' }:${ server.port }`, undefined, userAgent);
});

globalThis.addEventListener("unhandledrejection", (event) => {
   console.log('unhandled rejection', {event});
});
globalThis.addEventListener("unload", () => {
   db.close();
   console.log('unload, closing');
});

const { signal } = globalThis.controller;
await app.listen({ port, signal });
