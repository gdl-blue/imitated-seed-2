const hostconfig = require('./hostconfig');
const os = require('os');
const functions = require('./functions');
for(var item in functions) global[item] = functions[item];

var available = true;
try {
	if(os.cpus().length < 2) throw 1;
	if(process.versions.node.split('.')[0] < 16) throw 1;
	if(hostconfig.disable_multithreading) throw 1;
	require('worker_threads');
} catch(e) {
	available = false;
	console.warn('[경고!]: 시스템이 멀티 쓰레딩을 지원하지 않습니다');
}

if(available) {
	const { Worker } = require('worker_threads');
	module.exports = function markdown(req, content, discussion = 0, title = '', flags = '', root = '') {
		return new Promise((resolve, reject) => {
			const worker = new Worker('./namumark_parser_multithreaded.js', {
				workerData: { req: simplifyRequest(req), content, discussion, title, flags, root }
			});
			
			worker.on('error', e => {
				throw e;
				reject(e);
			});
			
			worker.on('message', ret => {
				resolve(ret);
			});
		});
	};
} else {
	module.exports = require('./namumark_parser');
}

