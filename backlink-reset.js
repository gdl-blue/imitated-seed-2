const namumark = require('./namumark');
const database = require('./database');
for(var item in database) global[item] = database[item];

const print = console.log;

function totitle(t, ns) {
	const nslist = fetchNamespaces();
	var forceShowNamespace = false;
	if(ns == '문서' && nslist.includes(t.split(':')[0]) && t.split(':')[1] !== undefined)
		forceShowNamespace = true;
	
	return {
		title: t, 
		namespace: ns, 
		forceShowNamespace,
		toString() {
			if(forceShowNamespace || this.namespace != '문서')
				return this.namespace + ':' + this.title;
			else
				return this.title;
		}
	};
}

const wikiconfig = {};
const hostconfig = require('./config.json'); 

const config = {
	getString(str, def = '') {
		if(typeof(wikiconfig[str]) == 'undefined') {
			wikiconfig[str] = def;
			return def;
		}
		return wikiconfig[str];
	}
};

function fetchNamespaces() {
	return ['문서', '틀', '분류', '파일', '사용자', '특수기능', config.getString('wiki.site_name', '더 시드'), '토론', '휴지통', '투표'].concat(hostconfig.custom_namespaces || []);
}

(async() => {
	var data = await db.all("select key, value from config");
	for(var cfg of data)
		wikiconfig[cfg.key] = cfg.value;
	
	print('기존 역링크 데이타 삭제 중...');
	await db.run("delete from backlink");
	print('문서 목록을 불러오는 중...');
	var dbdocs = await db.all("select title, namespace, content from documents");
	print('초기화 시작...');
	for(var item of dbdocs) {
		process.stdout.write('\'' + totitle(item.title, item.namespace) + '\' 처리 중... ');
		await namumark(null, item.content, 0, totitle(item.title, item.namespace) + '', 'backlinkinit ignoreincludeacl');
		print('완료!');
	}
	print('모두 처리 완료.');
})();

