const functions = require('./functions');
for(var item in functions) global[item] = functions[item];
const { parentPort, workerData } = require('worker_threads');

const markdown = require('./namumark_parser');

markdown(workerData.req, workerData.content, workerData.discussion, workerData.title, workerData.flags, workerData.root)
	.then(data => parentPort.postMessage(data))
	.catch(e => {
		log('렌더러', '오류! ' + e.stack);
		parentPort.postMessage('');
	});
