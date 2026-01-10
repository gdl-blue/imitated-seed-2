const readline = require('readline');
const database = require('./database');
for(var item in database) global[item] = database[item];

const print = console.log;

db.all("select title, namespace, topic, tnum from threads where deleted = '1'")
	.then(d => {
		var num = 1;
		for(item of d) {
			with(item)
				print(`[${num++}] ${namespace != '문서' ? (namespace + ':' + title) : title} - ${topic} (${tnum})`);
		}
		const rl = readline.createInterface(process.stdin, process.stdout);
		rl.question('토론 번호 또는 좌표: ', sel => {
			rl.close();
			var seln = Number(sel);
			if(!seln) {
				db.run("update threads set deleted = '0' where tnum = ?", [sel])
					.then(() => {
						print('복구됨.');
					}).catch(() => {
						print('복구할 수 없습니다');
					});
			} else if(!d[seln-1]) {
				print('복구할 수 없습니다');
			} else {
				db.run("update threads set deleted = '0' where tnum = ?", [d[seln-1].tnum])
					.then(() => {
						print('복구됨.');
					}).catch(() => {
						print('복구할 수 없습니다');
					});
			}
		});
	});
