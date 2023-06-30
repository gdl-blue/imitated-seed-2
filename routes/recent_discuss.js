router.get(/^\/RecentDiscuss$/, async function recentDicsuss(req, res) {
	var logtype = req.query['logtype'];
	if(!logtype) logtype = 'all';
	
	var content = `
		<ol class="breadcrumb link-nav">
			<li><a href="?logtype=normal_thread">[열린 토론]</a></li>
			<li><a href="?logtype=old_thread">[오래된 토론]</a></li>
			<li><a href="?logtype=closed_thread">[닫힌 토론]</a></li>

			<li><a href="?logtype=open_editrequest">[열린 편집 요청]</a></li>
			<li><a href="?logtype=accepted_editrequest">[승인된 편집 요청]</a></li>
			<li><a href="?logtype=closed_editrequest">[닫힌 편집 요청]</a></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				<col style="width: 22%; min-width: 100px;">
			</colgroup>
			<thead>
				<tr>
					<th>항목</th>
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
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
	
	for(var trd of trds) {
		const title = totitle(trd.title, trd.namespace) + '';
		
		content += `
			<tr>
				<td>
					${trd.state
						? `<a href="/edit_request/${ver('4.16.0') ? trd.slug : trd.id}">편집 요청 ${html.escape(ver('4.16.0') ? trd.slug : trd.id)}</a> (<a href="/discuss/${encodeURIComponent(title)}">${html.escape(title)}</a>)`
						: `<a href="/thread/${ver('4.16.0') ? trd.slug : trd.tnum}">${html.escape(trd.topic)}</a> (<a href="/discuss/${encodeURIComponent(title)}">${html.escape(title)}</a>)`
					}
				</td>
				
				<td>
					${generateTime(toDate(trd.time || trd.date), timeFormat)}
				</td>
			</tr>
		`;
	}
	content += `
			</tbody>
		</table>
	`;
	
	res.send(await render(req, '최근 토론', content, {}));
});
