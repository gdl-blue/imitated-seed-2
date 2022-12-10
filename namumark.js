const { Worker } = require('worker_threads');
const functions = require('./functions');
for(var item in functions) global[item] = functions[item];

function markdown(req, content, discussion = 0, title = '', flags = '', root = '') {
	return new Promise((resolve, reject) => {
		const worker = new Worker('./namumark_parser.js', {
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
}

module.exports = markdown;
