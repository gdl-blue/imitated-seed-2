// 역링크 초기화 (디버그 전용)
if(hostconfig.debug) router.get('/ResetXref', function(req, res) {
	print('기존 역링크 데이타 삭제');
	curs.execute("delete from backlink")
		.then(() => {
			print('문서 목록 불러오기');
			curs.execute("select title, namespace, content from documents")
				.then(async dbdocs => {
					print('초기화 시작...');
					for(var item of dbdocs) {
						prt(totitle(item.title, item.namespace) + ' 처리 중... ');
						await markdown(req, item.content, 0, totitle(item.title, item.namespace) + '', 'backlinkinit');
						print('완료!');
					}
					print('모두 처리 완료.');
					return res.send('완료!');
				});
		});
});