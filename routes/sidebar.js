router.get(/^\/sidebar[.]json$/, (req, res) => {
	curs.execute("select time, title, namespace from history where namespace = '문서' order by cast(time as integer) desc limit 1000")
		.then(async dbdata => {
			var ret = [], cnt = 0, used = [];
			for(var item of dbdata) {
				if(used.includes(item.title)) continue;
				used.push(item.title);
				
				const del = (await curs.execute("select title from documents where title = ? and namespace = '문서'", [item.title])).length;
				ret.push({
					document: totitle(item.title, '문서') + '',
					status: (del ? 'normal' : 'delete'),
					date: Math.floor(Number(item.time) / 1000),
				});
				cnt++;
				if(cnt > 20) break;
			}
			res.json(ret);
		})
		.catch(e => {
			print(e.stack);
			res.json('[]');
		});
});

router.get(/^\/api\/sidebar$/, async(req, res) => {
	var cret = [], dret = [], cnt, used;
	var dbdata = await curs.execute("select time, title, namespace from history order by cast(time as integer) desc limit 1000");
	cnt = 0, used = []
	for(var item of dbdata) {
		if(used.includes(item.title)) continue;
		used.push(item.title);
		const del = (await curs.execute("select title from documents where title = ? and namespace = ?", [item.title, item.namespace])).length;
		cret.push({
			document: totitle(item.title, item.namespace) + '',
			status: (del ? 'normal' : 'delete'),
			date: Math.floor(Number(item.time) / 1000),
		});
		cnt++;
		if(cnt > 10) break;
	}
	var dbdata = await curs.execute("select time, num, topic, title, namespace from threads order by cast(time as integer) desc limit 1000");
	cnt = 0, used = []
	for(var item of dbdata) {
		if(used.includes(item.num)) continue;
		used.push(item.num);
		dret.push({
			document: totitle(item.title, item.namespace) + '',
			topic: item.topic,
			date: Math.floor(Number(item.time) / 1000),
			id: Number(item.num),
		});
		cnt++;
		if(cnt > 10) break;
	}
	res.json({
		document: cret,
		discuss: dret,
	});
});