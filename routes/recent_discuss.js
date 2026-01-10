router.get(/^\/RecentDiscuss$/, async function recentDicsuss(req, res) {
	var logtype = req.query['logtype'];
	if(!logtype) logtype = 'all';
	
	var trds;
	
	switch(logtype) {
		case 'normal_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
		break; case 'old_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) asc limit 120");
		break; case 'closed_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'close' and not deleted = '1' order by cast(time as integer) desc limit 120");
		break; case 'open_editrequest':
			trds = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'open' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; case 'closed_editrequest':
			trds = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'closed' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; case 'accepted_editrequest':
			trds = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'accepted' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; default: {
			if(ver('4.18.1')) {
				trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
			} else {
				var data1 = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
				var data2 = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'open' and not deleted = '1' order by cast(date as integer) desc limit 120");
				trds = data1.concat(data2).sort((l, r) => ((r.date || r.time) - (l.date || l.time))).slice(0, 120);
			}
		}
	}
	
	res.send(await render(req, '최근 토론', 'recent_discuss', {
		recent_discuss: trds,
	}));
});
