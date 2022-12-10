if(ver('4.20.0')) {
	router.get(/^\/api\/edit\/(.*)$/, async(req, res) => {
		var auth = req.headers['authorization'] || '';
		if(!auth.match(/^Bearer\s([a-zA-Z0-9\=\+\/]+)$/))
			return res.status(403).json({
				status: err('raw', 'permission'),
			});
		auth = auth.match(/^Bearer\s([a-zA-Z0-9\=\+\/]+)$/)[1];
		var dbdata = await curs.execute("select username from api_tokens where token = ?", [auth]);
		if(!dbdata.length) {
			return res.status(403).json({
				status: err('raw', 'permission'),
			});
		}
		const username = dbdata[0].username;
		if(!getperm('api_access', username))
			return res.status(403).json({
				status: err('raw', 'permission'),
			});
		const title = req.params[0];
		const doc = processTitle(title);
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
		if(aclmsg) return res.status(403).json({
			status: err('raw', { code: 'permission_read', msg: aclmsg }),
		});
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 1);
		if(aclmsg) return res.status(403).json({
			status: err('raw', { code: 'permission_edit', msg: aclmsg }),
		});
		var exists = true;
		var text = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(!text[0]) text = '', exists = false;
		else text = text[0].content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		const token = Buffer.from(rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 48)).toString('base64');
		res.json({
			text, exists, token,
		});
		apiTokens[username] = token;
	});
	
	router.post(/^\/api\/edit\/(.*)$/, async(req, res) => {
		var auth = req.headers['authorization'] || '';
		if(!auth.match(/^Bearer\s([a-zA-Z0-9\=\+\/]+)$/))
			return res.status(403).json({
				status: err('raw', 'permission'),
			});
		auth = auth.match(/^Bearer\s([a-zA-Z0-9\=\+\/]+)$/)[1];
		var dbdata = await curs.execute("select username from api_tokens where token = ?", [auth]);
		if(!dbdata.length) {
			return res.status(403).json({
				status: err('raw', 'permission'),
			});
		}
		const username = dbdata[0].username;
		if(!getperm('api_access', username))
			return res.status(403).json({
				status: err('raw', 'permission'),
			});
		const title = req.params[0];
		const doc = processTitle(title);
		
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
		if(aclmsg) return res.status(403).json({
			status: err('raw', { code: 'permission_read', msg: aclmsg }),
		});
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 1);
		if(aclmsg) return res.status(403).json({
			status: err('raw', { code: 'permission_edit', msg: aclmsg }),
		});
		
		if(!apiTokens[username] || !req.body['token'] || apiTokens[username] != req.body['token'])
			return res.status(400).json({
				status: err('raw', 'invalid_token'),
			});
		
		var original = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		var ex = 1;
		if(!original[0]) ex = 0, original = '';
		else original = original[0]['content'];
		var text = req.body['text'] || '';
		text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		if(text.startsWith('#넘겨주기 ')) text = text.replace('#넘겨주기 ', '#redirect ');
		if(text.startsWith('#redirect ')) text = text.split('\n')[0] + '\n';
		const rawChanges = text.length - original.length;
		const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
		const log = req.body['log'] || '';
		var baserev = 0;
		var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
		if(data.length) baserev = data[0].rev;
		const ismember = 'author';
		var advance = 'normal';
		var data = await curs.execute("select title from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(!data.length) {
			if(['파일', '사용자'].includes(doc.namespace)) {
				if((ver('4.11.0') && !doc.title.includes('/')) || !ver('4.11.0')) {
					return res.status(400).json({
						status: err('raw', { code: 'invalid_namespace' }),
					}); } }
			advance = 'create';
			await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [doc.title, doc.namespace, text]);
		} else {
			await curs.execute("update documents set content = ? where title = ? and namespace = ?", [text, doc.title, doc.namespace]);
			curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
		}
		
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
		curs.execute("insert into history (isapi, title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
						values ('1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, text, String(Number(baserev) + 1), username, getTime(), changes, log, '0', '-1', ismember, advance
		]);
		markdown(req, text, 0, doc + '', 'backlinkinit');
		
		delete(apiTokens[username]);
		
		return res.json({
			status: 'success',
			rev: Number(baserev) + 1,
		});
	});
}