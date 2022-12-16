router.get(/^\/discuss\/(.*)/, async function threadList(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var state = req.query['state'];
	if(!state) state = '';
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var content = '';
	
	var trdlst;
	
	var subtitle = '';
	var viewname = '';
	
	if(state == 'close') {
		content += '<ul class=wiki-list>';
		
		var cnt = 0;
		trdlst = await curs.execute("select topic, tnum from threads where title = ? and namespace = ? and status = 'close' and not deleted = '1' order by cast(time as integer) desc", [doc.title, doc.namespace]);
		
		for(var trd of trdlst) {
			content += `<li>${++cnt}. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a></li>`;
		}
		
		content += '</ul>';
		
		subtitle = ' (닫힌 토론)';
		viewname = 'thread_list_close';
	} else if(state == 'closed_edit_requests') {
		content += '<ul class=wiki-list>';
		
		trdlst = await curs.execute("select id, slug from edit_requests where state = 'closed' and not deleted = '1' and title = ? and namespace = ? order by cast(date as integer) desc", [doc.title, doc.namespace]);
		
		for(var trd of trdlst) {
			content += `<li><a href="/edit_request/${ver('4.16.0') ? trd.slug : trd.id}">편집 요청 ${ver('4.16.0') ? trd.slug : trd.id}</a></li>`;
		}
		
		content += '</ul>';
		
		subtitle = ' (닫힌 편집 요청)';
		viewname = 'edit_request_list_close';
	} else {
		content += `
			<h3 class="wiki-heading">편집 요청</h3>
			<div class=wiki-heading-content>
				<ul class=wiki-list>
		`;
		
		var editRequests = [];
		var captcha = false;
		var deleteThread = !!getperm('delete_thread', ip_check(req));
		trdlst = await curs.execute("select id, slug from edit_requests where state = 'open' and not deleted = '1' and title = ? and namespace = ? order by cast(date as integer) desc", [doc.title, doc.namespace]);
		for(var item of trdlst) {
			content += `<li><a href="/edit_request/${ver('4.16.0') ? item.slug : item.id}">편집 요청 ${ver('4.16.0') ? item.slug : item.id}</a></li>`;
		}
		
		content += `
				</ul>
			</div>
			
			<p>
				<a href="?state=closed_edit_requests">[닫힌 편집 요청 보기]</a>
			</p>
		`;
		
		content += `
			<h3 class="wiki-heading">토론</h3>
			<div class=wiki-heading-content>
				<ul class=wiki-list>
		`;
		
		var cnt = 0;
		trdlst = await curs.execute("select topic, tnum from threads where title = ? and namespace = ? and not status = 'close' and not deleted = '1' order by cast(time as integer) desc", [doc.title, doc.namespace]);
		
		for(var trd of trdlst) {
			content += `<li><a href="#${++cnt}">${cnt}</a>. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a></li>`;
		}
		
		content += `
				</ul>
			</div>
				
			<p>
				<a href="?state=close">[닫힌 토론 목록 보기]</a>
			</p>`
		
		cnt = 0;
		var thread_list = [];
		for(var trd of trdlst) {
			content += `
				<h2 class=wiki-heading id="${++cnt}">
					${cnt}. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a>
				</h2>
				
				<div class=topic-discuss>
			`;
			
			const d = {
				slug: trd.tnum,
				topic: trd.topic,
				discuss: [],
			};
			
			const td = await curs.execute("select isadmin, id, content, username, time, hidden, hider, status, ismember from res where tnum = ? order by cast(id as integer) asc", [trd.tnum]);
			const ltid = Number((await curs.execute("select id from res where tnum = ? order by cast(id as integer) desc limit 1", [trd.tnum]))[0]['id']);
			
			var ambx = false;
			
			const fstusr = (await curs.execute("select username from res where tnum = ? and (id = '1')", [trd.tnum]))[0]['username'];
			
			for(var rs of td) {
				const crid = Number(rs['id']);
				if(ltid > 4 && crid != 1 && (crid < ltid - 2)) {
					if(!ambx) {
						content += `
							<div>
								<a class=more-box href="/thread/${trd.tnum}">more...</a>
							</div>
						`;
						
						ambx = true;
					}
					continue;
				}
				
				content += `
					<div class=res-wrapper>
						<div class="res res-type-${rs['status'] == '1' ? 'status' : 'normal'}">
							<div class="r-head${rs['username'] == fstusr ? " first-author" : ''}">
								<span class=num>#${rs['id']}</span> ${ip_pas(rs['username'], rs['ismember'], 1).replace('<a ', rs.isadmin == '1' ? '<a style="font-weight: bold;" ' : '<a ')} <span class=pull-right>${generateTime(toDate(rs['time']), timeFormat)}</span>
							</div>
							
							<div class="r-body${rs['hidden'] == '1' ? ' r-hidden-body' : ''}">
								${
									rs['hidden'] == '1'
									? (
										getperm('hide_thread_comment', ip_check(req))
										? '[' + rs['hider'] + '에 의해 숨겨진 글입니다.]<div class="text-line-break" style="margin: 25px 0px 0px -10px; display:block"><a class="text" onclick="$(this).parent().parent().children(\'.hidden-content\').show(); $(this).parent().css(\'margin\', \'15px 0 15px -10px\'); return false;" style="display: block; color: #fff;">[ADMIN] Show hidden content</a><div class="line"></div></div><div class="hidden-content" style="display:none">' + await markdown(req, rs['content'], 1) + '</div>'
										: '[' + rs['hider'] + '에 의해 숨겨진 글입니다.]'
									  )
									: await markdown(req, rs['content'], 1)
								}
							</div>
						</div>
					</div>
				`;
				
				const t = {
					id: rs.id, 
					text: rs.content, 
					date: Math.floor(Number(rs.time / 1000)), 
					hide_author: rs.hidden == '1' ? rs.hider : null, 
					type: rs.status == '1' ? 'status' : 'normal', 
					admin: rs.isadmin == '1' ? true : false };
				t[rs.ismember] = rs.username;
				d.discuss.push(t);
			}
			content += '</div>';
			
			thread_list.push(d);
		}
			
		content += `
			<h3 class="wiki-heading">새 주제 생성</h3>
			
			${doc + '' == (config.getString('wiki.front_page', 'FrontPage')) ? `
				<div class="alert alert-success alert-dismissible fade in" role="alert">
					<strong>[경고!]</strong> 이 토론은 ${doc + ''} 문서의 토론입니다. ${doc + ''} 문서와 관련 없는 토론은 각 문서의 토론에서 진행해 주시기 바랍니다. ${doc + ''} 문서와 관련 없는 토론은 삭제될 수 있습니다.
				</div>
			` : ''}
			
			<form method=post class="new-thread-form" id="topicForm">
				<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">
				<div class="form-group">
					<label class=control-label for="topicInput" style="margin-bottom: 0.2rem;">주제 :</label>
					<input type="text" class=form-control id="topicInput" name="topic">
				</div>

				<div class="form-group">
				<label class=control-label for="contentInput" style="margin-bottom: 0.2rem;">내용 :</label>
					<textarea name="text" class=form-control id="contentInput" rows="5"></textarea>
				</div>
				
				${islogin(req) ? '' : `<p style="font-weight: bold; font-size: 1rem;">[알림] 비로그인 상태로 토론 주제를 생성합니다. 토론 내역에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
				
				${generateCaptcha(req, req.session.captcha)}
				
				<div class="btns">
					<button id="createBtn" class="btn btn-primary" style="width: 8rem;">전송</button>
				</div>

				<!--
				<div id="recaptcha"><div><noscript>Aktiviere JavaScript, um eine reCAPTCHA-Aufgabe zu erhalten.&lt;br&gt;</noscript><div class="if-js-enabled">Führe ein Upgrade auf einen <a href="http://web.archive.org/web/20171027095753/https://support.google.com/recaptcha/?hl=en#6223828">unterstützten Browser</a> aus, um eine reCAPTCHA-Aufgabe zu erhalten.</div><br>Wenn du meinst, dass diese Seite fälschlicherweise angezeigt wird, überprüfe bitte deine Internetverbindung und lade die Seite neu.<br><br><a href="http://web.archive.org/web/20171027095753/https://support.google.com/recaptcha#6262736" target="_blank">Warum gerade ich?</a></div></div>
				<script>
					recaptchaInit('recaptcha', {
						'sitekey': '',
						'size': 'invisible',
						'bind': 'createBtn',
						'badge': 'inline',
						'callback': function() { $("#createBtn").attr("disabled", true); $("#topicForm").submit(); }
					});
				</script>
				-->
			</form>
		`;
		
		subtitle = ' (토론)';
		viewname = 'thread_list';
	}
	
	res.send(await render(req, totitle(doc.title, doc.namespace) + subtitle, content, {
		document: doc,
		deleteThread,
		captcha,
		thread_list,
		editRequests,
	}, '', null, viewname));
});

router.post(/^\/discuss\/(.*)/, async function createThread(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'create_thread', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_create_thread', msg: aclmsg }));
	
	if(!validateCaptcha(req)) return res.send(await showError(req, { code: 'captcha_validation_failed' }));
	
	if(!req.body['topic']) return res.send(await showError(req, { code: 'validator_required', tag: 'topic' }));
	if(!req.body['text']) return res.send(await showError(req, { code: 'validator_required', tag: 'text' }));
	
	var tnum;
	do {
		tnum = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 22);
		var dd = await curs.execute("select tnum from threads where tnum = ?", [tnum]);
		if(!dd.length) break;
	} while(1);
	const newid = newID();
	
	await curs.execute("insert into threads (title, namespace, topic, status, time, tnum, slug) values (?, ?, ?, ?, ?, ?, ?)",
					[doc.title, doc.namespace, req.body['topic'], 'normal', getTime(), tnum, newid]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, slug) values \
					(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					['1', req.body['text'], ip_check(req), getTime(), '0', '', '0', tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0', newid]);
	
	delete req.session.captcha;
	
	res.redirect('/thread/' + tnum);
});

router.get(/^\/topic\/(\d+)$/, async(req, res, next) => {
	const num = req.params[0];
	var data = await curs.execute("select tnum from threads where num = ?", [num]);
	if(data.length) return res.redirect('/thread/' + data[0].tnum);
	next();
});

router.get(ver('4.16.0') ? /^\/thread\/([a-zA-Z0-9]+)$/ : /^\/thread\/([a-zA-Z0-9]{18,24})$/, async function viewThread(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var content = `
		<h2 class=wiki-heading style="cursor: pointer;">
			${html.escape(topic)}
			${
				getperm('delete_thread', ip_check(req))
				? '<span class=pull-right><a onclick="return confirm(\'삭제하시겠습니까?\');" href="/admin/thread/' + tnum + '/delete" class="btn btn-danger btn-sm">[ADMIN] 삭제</a></span>'
				: ''
			}
		</h2>
		
		<div class=wiki-heading-content>
			<div id=res-container>
	`;
	
	for(var i=1; i<=rescount; i++) {
		content += `
			<div class="res-wrapper res-loading" data-id=${i} data-locked=false data-visible=false>
				<div class="res res-type-normal">
					<div class=r-head>
						<span class=num><a id="${i}">#${i}</a>&nbsp;</span>
					</div>
					
					<div class=r-body></div>
				</div>
			</div>
		`;
	}
	
	content += `
			</div>
		</div>
		
		<script>$(function() { discussPollStart("${tnum}"); });</script>
		
		<h2 class=wiki-heading style="cursor: pointer;">댓글 달기</h2>
	`;
	
	if(getperm('update_thread_status', ip_check(req))) {
		var sts = '';
		
		if(status == 'close')
			sts = `
				<option value=normal>normal</option>
				<option value=pause>pause</option>
			`;
		if(status == 'normal')
			sts = `
				<option value=close>close</option>
				<option value=pause>pause</option>
			`;
		if(status == 'pause')
			sts = `
				<option value=close>close</option>
				<option value=normal>normal</option>
			`;
		
		content += `
		    <form method=post id=thread-status-form>
        		[ADMIN] 쓰레드 상태 변경
        		<select name=status>${sts}</select>
        		<button id=changeBtn class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	if(getperm('update_thread_document', ip_check(req)) && ver('4.4.3')) {
		content += `
        	<form method=post id=thread-document-form>
        		[ADMIN] 쓰레드 이동
        		<input type=text name=document value="${doc}">
        		<button id=changeBtn class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	if(getperm('update_thread_topic', ip_check(req)) && ver('4.4.3')) {
		content += `
        	<form method=post id=thread-topic-form>
        		[ADMIN] 쓰레드 주제 변경
        		<input type=text name=topic value="${topic}">
        		<button id=changeBtn class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	content += `
		<form id=new-thread-form method=post>
			${ver('4.20.0') ? `
				<ul class="nav nav-tabs" role="tablist" style="height: 38px;">
					<li class="nav-item">
						<a style="width: 128px; text-align: center;" id=textInputLink class="nav-link active" data-toggle="tab" href="#edit" role="tab">${'RAW 편집'}</a>
					</li>
					<li class="nav-item">
						<a style="width: 128px; text-align: center;" id="commentPreviewLink" class="nav-link" data-toggle="tab" href="#preview" role="tab">미리보기</a>
					</li>
				</ul>

				<div class="tab-content bordered">
					<div class="tab-pane active" id="edit" role="tabpanel">
						<span id=editForm><textarea style="height: initial;" class=form-control${['close', 'pause'].includes(status) ? ' readonly disabled' : ''} rows=5 name=text id=textInput>${status == 'pause' ? 'pause 상태입니다.' : (status == 'close' ? '닫힌 토론입니다.' : '')}</textarea></span>
					</div>
					<div class="tab-pane" id="preview" role="tabpanel" style="padding: 20px;">
						
					</div>
				</div>
				
				<script>
					$(function() {
						/* theseed.js 좀 베낌 ㅎㅎ; */
						$('#commentPreviewLink').click(function(event) {
							var id = $('div#res-container > div.res-wrapper').length + 1;
							var text = $('form#new-thread-form textarea#textInput').val();
							if($('form#new-thread-form textarea#textInput[disabled]').length || !text) {
								$('#textInputLink').click();
								return false;
							}
							$(".tab-pane#preview").html('<div style="border: none; margin: 0; padding: 0;" class="res-wrapper res-loading" data-id="' + id + '" data-locked="true" data-visible="true"><div class="res res-type-normal"><div class="r-head"><span class="num"><a href=#>#' + id + '</a>&nbsp;</span></div><div class="r-body"></div></div></div>');
							$.ajax({
								type: 'POST',
								data: {
									id,
									text,
								},
								url: '/commentpreview',
								dataType: 'html',
								success: function(d) {
									$(".tab-pane#preview").html(d);
								}
							});
						});
					});
				</script>
			` : `
				<textarea class=form-control${['close', 'pause'].includes(status) ? ' readonly disabled' : ''} rows=5 name=text>${status == 'pause' ? 'pause 상태입니다.' : (status == 'close' ? '닫힌 토론입니다.' : '')}</textarea>
			`}
			
			${islogin(req) ? '' : `<p style="font-weight: bold; font-size: 1rem;">[알림] 비로그인 상태로 토론에 참여합니다. 토론 내역에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class=btns>
				<button type=submit class="btn btn-primary" style="width: 120px;"${['close', 'pause'].includes(status) ? ' disabled' : ''}>전송</button>
			</div>
		</form>
	`;
	
	res.send(await render(req, totitle(title, namespace) + ' (토론) - ' + topic, content, {
		document: doc,
	}, '', null, 'thread'));
});

router.post(/^\/thread\/([a-zA-Z0-9]{18,24})$/, async function postThreadComment(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'write_thread_comment', 1);
	if(aclmsg) return res.status(403).json({ status: aclmsg });
	if(['close', 'pause'].includes(status)) return res.status(403).json({});
	if(!req.body['text']) return res.status(400).json({ status: err('error', { code: 'validator_required', tag: 'text' }) + '' });
	
	var data = await curs.execute("select id from res where tnum = ? order by cast(id as integer) desc limit 1", [tnum]);
	const lid = Number(data[0].id);
	
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						String(lid + 1), req.body['text'], ip_check(req), getTime(), '0', '', '0', tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0'
					]);
	await curs.execute("update threads set time = ? where tnum = ?", [getTime(), tnum]);
	
	res.json({});
});

router.get(/^\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)\/raw$/, async function sendThreadData(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select username from res where tnum = ? and (id = '1')", [tnum]);
	const fstusr = data[0]['username'];
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var content = ``;
	var data = await curs.execute("select isadmin, type, id, content, username, time, hidden, hider, status, ismember from res where tnum = ? and id = ? order by cast(id as integer) asc", [tnum, Number(tid)]);
	
	res.setHeader('content-type', 'text/plain');
	if(!data.length || (data[0].hidden == '1' && !getperm('hide_thread_comment', ip_check(req)))) return res.send('');
	res.send(data[0].content)
});

router.get(/^\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)$/, async function sendThreadData(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select username from res where tnum = ? and (id = '1')", [tnum]);
	const fstusr = data[0]['username'];
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var content = ``;
	var data = await curs.execute("select isadmin, type, id, content, username, time, hidden, hider, status, ismember from res where tnum = ? and (cast(id as integer) = 1 or (cast(id as integer) >= ? and cast(id as integer) < ?)) order by cast(id as integer) asc", [tnum, Number(tid), Number(tid) + 30]);
	for(var rs of data) {
		var menu = '';
		if(ver('4.19.0')) {
			var _hidebtn = '';
			if(getperm('hide_thread_comment', ip_check(req))) {
				_hidebtn = `<a style="width: 100%;" class="btn btn-danger btn-sm" href="/admin/thread/${tnum}/${rs.id}/${rs.hidden == '1' ? 'show' : 'hide'}">[ADMIN] 숨기기${rs.hidden == '1' ? ' 해제' : ''}</a>`;
			}
			
			if(rs.status != 1) menu = `
				<span style="position: relative;">
					<button onclick="$('.thread-popover:not(#popover-${rs.id})').hide(); $(this).next().fadeToggle('fast');" class="btn btn-secondary btn-sm" type=button style="background-color: transparent; padding: 8px 6px; line-height: 0px;">
						<span style="border-left: .3em solid transparent; border-right: .3em solid transparent; border-top: .3em solid; display: inline-block; height: 0; vertical-align: middle; width: 0;"></span>
					</button>
					
					<div class=thread-popover id=popover-${rs.id} class=wrapper style="z-index: 9999; display: none; position: absolute; top: 32px; right: -2px;">
						<div class="tooltip-inner popover-inner" style="position: relative; background: #f9f9f9; border-radius: 5px; box-shadow: 0 5px 30px rgba(0, 0, 0, .2); color: #000; padding: 16px;">
							<button data-state=wiki onclick="var btn = $(this); if(btn.attr('data-state') == 'wiki') window.rescontent${rs.id} = $('div.res-wrapper[data-id=&quot;${rs.id}&quot;] > .res > .r-body').html(), $.ajax({ url: '/thread/${tnum}/${rs.id}/raw', dataType: 'html', success: function(d) { var obj = $('div.res-wrapper[data-id=&quot;${rs.id}&quot;] > .res > .r-body').text(d.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n')); obj.html(obj.html().replace(/\\n/g, '<br />')); btn.attr('data-state', 'raw'); btn.text('위키 보기'); if(!d) { alert('권한이 부족합니다.'); btn.click(); } } }); else $('div.res-wrapper[data-id=&quot;${rs.id}&quot;] > .res > .r-body').html(window.rescontent${rs.id}), btn.text('원문 보기'), btn.attr('data-state', 'wiki');" style="width: 100%;" class="btn btn-secondary btn-sm">원문 보기</button>
							${_hidebtn}
						</div>
						<div class="tooltip-arrow popover-arrow" style="border-style: solid; height: 0; margin: 5px; position: absolute; width: 0; z-index: 1; border-width: 0 5px 5px; right: 5px; margin-bottom: 0; margin-top: 0; top: -5px; border-left-color: transparent !important; border-right-color: transparent !important; border-top-color: transparent !important; border-color: #f9f9f9;"></div>
					</div>
				</span>
			`;
		}
		
		var rescontent = rs.status == 1
			? (
				rs.type == 'status'
				? (ver('4.4.3') ? ('스레드 상태를 <strong>' + rs.content + '</strong>로 변경') : ('토픽 상태를 ' + rs.content + '로 변경'))
				: (
					rs.type == 'document'
					? '스레드를 <strong>' + rs.content + '</strong> 문서로 이동'
					: '스레드 주제를 <strong>' + rs.content + '</strong>로 변경'
				)
			) : await markdown(req, rs.content, 1);
		
		if(rs.hidden == '1') {
			var rc = rescontent;
			rescontent = '[' + rs.hider + '에 의해 숨겨진 글입니다.]';
			if(getperm('hide_thread_comment', ip_check(req))) {
				if(ver('4.13.0')) {
					rescontent += '<a class="btn btn-danger btn-sm" onclick="$(this).parent().attr(\'class\', \'r-body\'); $(this).parent().html($(this).parent().children(\'.hidden-content\').html()); return false;">[ADMIN] SHOW</a><div class=hidden-content style="display:none">' + rc + '</div>';
				} else {
					rescontent += '<div class=text-line-break style="margin: 25px 0px 0px -10px; display:block"><a class=text onclick="$(this).parent().parent().children(\'.hidden-content\').show(); $(this).parent().css(\'margin\', \'15px 0 15px -10px\'); $(this).hide(); return false;" style="display: block; color: #fff;">[ADMIN] Show hidden content</a><div class=line></div></div><div class=hidden-content style="display:none">' + rc + '</div>';
				}
			}
		}
		
		content += `
			<div class=res-wrapper data-id="${rs.id}">
				<div class="res res-type-${rs.status == '1' ? 'status' : 'normal'}">
					<div class="r-head${rs.username == fstusr ? ' first-author' : ''}">
						<span class=num>
							<a id="${rs.id}">#${rs.id}</a>&nbsp;
						</span> ${ip_pas(rs.username, rs.ismember, 1).replace('<a ', rs.isadmin == '1' ? '<a style="font-weight: bold;" ' : '<a ')}${rs['ismember'] == 'author' && await userblocked(rs.username) ? ` <small>(${ver('4.11.3') ? '차단됨' : '차단된 사용자'})</small>` : ''}${rs.ismember == 'ip' && await ipblocked(rs.username) ? ` <small>(${ver('4.11.3') ? '차단됨' : '차단된 아이피'})</small>` : ''}
						<span class=pull-right>
							${generateTime(toDate(rs.time), timeFormat)}
							${menu}
						</span>
					</div>
					
					<div class="r-body${rs.hidden == '1' ? ' r-hidden-body' : ''}">
						${rescontent}
					</div>
		`;
		if(getperm('hide_thread_comment', ip_check(req)) && !ver('4.19.0')) {
			content += `
				<div class="combo admin-menu">
					<a class="btn btn-danger btn-sm" href="/admin/thread/${tnum}/${rs.id}/${rs.hidden == '1' ? 'show' : 'hide'}">[ADMIN] 숨기기${rs.hidden == '1' ? ' 해제' : ''}</a>
				</div>
			`;
		}
		content += `
				</div>
			</div>
		`;
	}
	
	res.send(content);
});

router.get(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)\/show$/, async function showHiddenComment(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	if(!getperm('hide_thread_comment', ip_check(req))) return res.send(await showError(req, 'permission'));
	await curs.execute("update res set hidden = '0', hider = '' where tnum = ? and id = ?", [tnum, tid]);
	
	res.redirect('/thread/' + tnum);
});

router.get(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)\/hide$/, async function hideComment(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	if(!getperm('hide_thread_comment', ip_check(req))) return res.send(await showError(req, 'permission'));
	await curs.execute("update res set hidden = '1', hider = ? where tnum = ? and id = ?", [ip_check(req), tnum, tid]);
	
	res.redirect('/thread/' + tnum);
});

router.post(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/status$/, async function updateThreadStatus(req, res) {
	if(!getperm('update_thread_status', ip_check(req))) return res.status(403).send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var newstatus = req.body['status'];
	if(!['close', 'pause', 'normal'].includes(newstatus)) res.status(400).send('');
	
	await curs.execute("update threads set time = ?, status = ? where tnum = ?", [getTime(), newstatus, tnum]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'status')", [
						String(rescount + 1), newstatus, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

router.post(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/document$/, async function updateThreadDocument(req, res) {
	if(!getperm('update_thread_document', ip_check(req))) return res.status(403).send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var newdoc = req.body['document'];
	if(!newdoc.length) return res.status(400).send('');
	var dd = processTitle(newdoc);
	
	var aclmsg = await getacl(req, dd.title, dd.namespace, 'create_thread', 1);
	if(aclmsg) return res.json({
		status: aclmsg,
	});
	
	await curs.execute("update threads set time = ?, title = ?, namespace = ? where tnum = ?", [getTime(), dd.title, dd.namespace, tnum]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'document')", [
						String(rescount + 1), newdoc, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

router.post(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/topic$/, async function updateThreadTopic(req, res) {
	if(!getperm('update_thread_topic', ip_check(req))) return res.status(403).send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));

	var newtopic = req.body['topic'];
	if(!newtopic.length) return res.status(400).send('');
		
	await curs.execute("update threads set time = ?, topic = ? where tnum = ?", [getTime(), newtopic, tnum]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'topic')", [
						String(rescount + 1), newtopic, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

router.get(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/delete/, async function deleteThread(req, res) {
	if(!getperm('delete_thread', ip_check(req))) return res.send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	const rescount = data.length;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select title, namespace from threads where tnum = ?", [tnum]);
	const title = totitle(data[0].title, data[0].namespace) + '';
	
	await curs.execute("update threads set deleted = '1' where tnum = ?", [tnum]);
	res.redirect('/discuss/' + encodeURIComponent(title));
});

router.post(/^\/notify\/thread\/([a-zA-Z0-9]{18,24})$/, async function notifyEvent(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var dd = await curs.execute("select id from res where tnum = ?", [tnum]);
	const rescount = dd.length;
	if(!rescount) return res.send(await showError(req, "thread_not_found"));	
	var data = await curs.execute("select id from res where tnum = ? order by cast(time as integer) desc limit 1", [tnum]);
	res.json({
		status: 'event',
		comment_id: Number(data[0].id),
	});
});