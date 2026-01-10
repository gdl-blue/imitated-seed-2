const sizeOf = require('image-size');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const chttp = hostconfig.file_use_https ? https : http;

function postFile(file, cb) {
	const ext = path.extname(file.name).toLowerCase().replace('.', '');
	const boundary = '--------theseedfileboundary' + (Math.random() * 100000000000000000);
	const req = chttp.request({
		host: hostconfig.file_host,
		port: hostconfig.file_port,
		path: '/upload',
		method: 'POST',
		headers: {
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
		},
	}, res => {
		var data = '';
		res.on('data', chunk => data += chunk);
		res.on('end', () => cb(false, JSON.parse(data)));
	});
	req.on('error', () => cb(true));
	req.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: image/${ext == 'jpg' || ext == 'jpe' ? 'jpeg' : ext}\r\n\r\n`);
	req.write(file.data);
	req.end(`\r\n--${boundary}--\r\n`);
}

router.all(/^\/Upload$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const licelst = await curs.execute("select title from documents where namespace = '틀' and title like '이미지 라이선스/%' order by title");
	const catelst = await curs.execute("select title from documents where namespace = '분류' and title like '파일/%' order by title");
	
	const licenses = [], categories = [];
	for(var lice of licelst)
		licenses.push(lice.title.replace('이미지 라이선스/', ''));
	for(var cate of catelst)
		categories.push(cate.title.replace('파일/', ''));

	const captcha = generateCaptcha(req);
	const identifier = `${islogin(req) ? 'm' : 'i'}:${ip_check(req)}`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		if(!validateCaptcha(req)) { error = err('alert', { code: 'captcha_validation_failed' }); break; }
		if(!req.files || !req.files.file) { error = err('alert', { code: 'file_not_uploaded' }); break; }
		var file = req.files.file;
		file.name = file.name.replace(/(\\|\/|[:]|[*]|[?]|\"|[<]|[>]|[|])/g, '');
		var title = req.body['document'];
		if(!title) { error = err('alert', { code: 'validator_required', tag: 'document' }); break; }
		var doc = processTitle(title);
		if(doc.namespace != '파일') { error = err('alert', { msg: '업로드는 파일 이름 공간에서만 가능합니다.' }); break; }
		const ext = path.extname(file.name).toLowerCase().replace('.', '');
		if(path.extname(doc.title).toLowerCase() != '.' + ext) {
			error = err('alert', { msg: '문서 이름과 확장자가 맞지 않습니다. (파일 확장자: ' + ext + ')' });
			break;
		}
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 1);
		if(aclmsg) { error = err('alert', { code: 'permission_edit', msg: aclmsg }); break; }
		
		var data = await curs.execute("select title from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(data.length) { error = err('alert', { msg: '문서가 이미 존재합니다.' }); break; }
		
		if(!hostconfig.disable_file_server) {
			postFile(file, async (e, data) => {
				if(e) {
					error = err('alert', { msg: '파일 서버가 사용가능하지 않습니다.' });
					return res.send(await render(req, '파일 올리기', 'upload', {
						captcha,
						identifier,
						licenses,
						categories,
					}, error));
				} else if(data.status != 'success') {
					error = err('alert', { code: 'file_not_uploaded' });
					return res.send(await render(req, '파일 올리기', 'upload', {
						captcha,
						identifier,
						licenses,
						categories,
					}, error));
				} else {
					var baserev = 0;
					var dbdata = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
					if(dbdata.length) baserev = Number(dbdata[0].rev);
					
					await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [doc.title, doc.namespace, req.body.text]);
					const ismember = islogin(req) ? 'author' : 'ip';
					curs.execute("update documents set time = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
					curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						doc.title, doc.namespace, req.body.text || '', String(baserev + 1), ip_check(req), getTime(), req.body.text.length ? ('+' + req.body.text.length) : '0', req.body.log || ('파일 ' + file.name + '을 올림'), '0', '-1', ismember, 'create'
					]);

					await curs.execute("delete from files where title = ? and namespace = ?", [doc.title, doc.namespace]);
					await curs.execute("insert into files (title, namespace, hash, url, size, width, height) values (?, ?, ?, ?, ?, ?, ?)", [doc.title, doc.namespace, data.hash, 'http' + (hostconfig.file_use_https ? 's' : '') + '://' + hostconfig.file_host + ':' + hostconfig.file_port + '/' + data.hash.slice(0, 2) + '/' + data.hash, data.size || '0', data.width, data.height]);
					
					return res.redirect('/w/' + totitle(doc.title, doc.namespace));
				}
			});
		} else {
			const hash = sha256(file.data);
			fs.mkdir('./images', function() {
				fs.mkdir(`./images/${hash.slice(0, 2)}`, function() {
					file.mv(`./images/${hash.slice(0, 2)}/${hash}`, async e => {
						if(e) {
							error = err('alert', { code: 'file_not_uploaded' });
							return res.send(await render(req, '파일 올리기', 'upload', {
								captcha,
								identifier,
								licenses,
								categories,
							}, error));
						}
						
						var baserev = 0;
						var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
						if(data.length) baserev = Number(data[0].rev);
						
						await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [doc.title, doc.namespace, req.body.text]);
						const ismember = islogin(req) ? 'author' : 'ip';
						curs.execute("update documents set time = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
						curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
							doc.title, doc.namespace, req.body.text || '', String(baserev + 1), ip_check(req), getTime(), req.body.text.length ? ('+' + req.body.text.length) : '0', req.body.log || ('파일 ' + file.name + '을 올림'), '0', '-1', ismember, 'create'
						]);
						var w = 0, h = 0;
						sizeOf(`./images/${hash.slice(0, 2)}/${hash}`, async function (e, dimensions) {
							if(!e) w = dimensions.width, h = dimensions.height;
							await curs.execute("delete from files where title = ? and namespace = ?", [doc.title, doc.namespace]);
							await curs.execute("insert into files (title, namespace, hash, url, size, width, height) values (?, ?, ?, ?, ?, ?, ?)", [doc.title, doc.namespace, hash, '/images/' + hash.slice(0, 2) + '/' + hash, file.data.length, w, h]);
							return res.redirect('/w/' + totitle(doc.title, doc.namespace));
						});
					});
				});
			});
		}
		
		return;
	} while(0);
	
	res.send(await render(req, '파일 올리기', 'upload', {
		captcha,
		identifier,
		licenses,
		categories,
	}, error));
});