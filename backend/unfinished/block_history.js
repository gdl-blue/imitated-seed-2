router.get(/^\/BlockHistory$/, async(req, res) => {
	var pa = [];
	var qq = " where '1' = '1' ";
	if(req.query['target'] && req.query['query']) {
		const com = req.query['query'].startsWith('"') && req.query['query'].endsWith('"');
		const query = com ? req.query['query'].replace(/^\"/, '').replace(/\"$/, '') : req.query['query'];
		if(req.query['target'] == 'author') {
			qq = 'where executer' + (com ? ' = ? ' : "like '%' || ? || '%' ");
			pa = [query];
		} else {
			qq = 'where note ' + (com ? ' = ? ' : "like '%' || ? || '%' ") + ' or target ' + (com ? ' = ? ' : "like '%' || ? || '%' ");
			pa = [query, query];
		}
	}
	var total = (await curs.execute("select count(logid) from block_history"))[0]['count(logid)'];
	
	const from = req.query['from'];
	const until = req.query['until'];
	var data;
	if(from) {
		data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " + 
							qq + " and (cast(logid as integer) <= ? AND cast(logid as integer) > ?) order by cast(date as integer) desc limit 100", 
							pa.concat([Number(from), Number(from) - 100]));
	} else if(until) {
		data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " + 
							qq + " and (cast(logid as integer) >= ? AND cast(logid as integer) < ?) order by cast(date as integer) desc limit 100", 
							pa.concat([Number(until), Number(until) + 100]));
	} else {
		data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " + 
							qq + " order by cast(date as integer) desc limit 100", 
							pa);
	}
	
	try {
		var navbtns = navbtn(total, data[data.length-1].logid, data[0].logid, '/BlockHistory');
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	var content = `
		<form>
			<select name="target">
				<option value="text"${req.query['target'] == 'text' ? ' selected' : ''}>내용</option>
				<option value="author"${req.query['target'] == 'author' ? ' selected' : ''}>실행자</option>
			</select>
			
			<input name="query" placeholder="검색" type="text" value="${html.escape(req.query['query']) || ''}" />
			<input value="검색" type="submit" />
		</form>
		
		${navbtns}
		
		<ul class=wiki-list>
	`;
	
	function parses(s) {
		s = Number(s);
		var ret = '';
		if(s && s / 604800 >= 1) (ret += parseInt(s / 604800) + '주 '), s = s % 604800;
		if(s && s / 86400 >= 1) (ret += parseInt(s / 86400) + '일 '), s = s % 86400;
		if(s && s / 3600 >= 1) (ret += parseInt(s / 3600) + '시간 '), s = s % 3600;
		if(s && s / 60 >= 1) (ret += parseInt(s / 60) + '분 '), s = s % 60;
		if(s && s / 1 >= 1) (ret += parseInt(s / 1) + '초 '), s = s % 1;
		
		return ret.replace(/\s$/, '');
	}
	
	for(var item of data) {
		if(['aclgroup_add', 'aclgroup_remove'].includes(item.type) && !ver('4.18.0')) continue;
		
		content += `
			<li>${generateTime(toDate(item.date), timeFormat)} ${ip_pas(item.executer, item.ismember)} 사용자가 ${item.target} <i>(${
				item.type == 'aclgroup_add'
				? `<b>${item.aclgroup}</b> ACL 그룹에 추가`
				: (
				item.type == 'aclgroup_remove'
				? `<b>${item.aclgroup}</b> ACL 그룹에서 제거`
				: (
				item.type == 'ipacl_add'
				? `IP 주소 차단`
				: (
				item.type == 'ipacl_remove'
				? `IP 주소 차단 해제`
				: (
				item.type == 'login_history'
				? `사용자 로그인 기록 조회`
				: (
				item.type == 'suspend_account' && item.duration != '-1'
				? `사용자 차단`
				: (
				item.type == 'suspend_account' && item.duration == '-1'
				? `사용자 차단 해제`
				: (
				item.type == 'grant'
				? `사용자 권한 설정`
				: ''
				)))))))
			})</i> ${item.type == 'aclgroup_add' || item.type == 'aclgroup_remove' ? `#${item.id}` : ''} ${
				item.type == 'aclgroup_add' || item.type == 'ipacl_add' || (item.type == 'suspend_account' && item.duration != '-1')
				? (major == 4 && ver('4.0.20') ? `(${item.duration == '0' ? '영구적으로' : `${parses(item.duration)} 동안`})` : `${item.duration} 동안`)
				: ''
			} ${
				item.type == 'aclgroup_add' || item.type == 'aclgroup_remove' || item.type == 'ipacl_add' || item.type == 'suspend_account' || item.type == 'grant'
				? `(<span style="color: gray;">${item.note}</span>)`
				: ''
			}</li>
		`;
	}
	
	content += `
		</ul>
		
		${navbtns}
	`;
	
	return res.send(await render(req, '차단 내역', content, {}, _, _, 'block_history'));
});