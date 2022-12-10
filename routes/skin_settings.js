router.get(/^\/settings$/, async(req, res) => {
    res.send(await render(req, '스킨 설정', '이 스킨은 설정 기능을 지원하지 않습니다.', {}, _, _, 'settings'));
});