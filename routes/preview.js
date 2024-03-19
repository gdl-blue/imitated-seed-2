router.post(/^\/preview\/(.*)$/, async(req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var skinconfig = skincfgs[getSkin(req)];
	var header = '';
	for(var i=0; i<skinconfig["auto_css_targets"]['*'].length; i++) {
		header += '<link rel=stylesheet href="/skins/' + getSkin(req) + '/' + skinconfig["auto_css_targets"]['*'][i] + '">';
	}
	for(var i=0; i<skinconfig["auto_js_targets"]['*'].length; i++) {
		header += '<script type="text/javascript" src="/skins/' + getSkin(req) + '/' + skinconfig["auto_js_targets"]['*'][i]['path'] + '"></script>';
	}
	header += skinconfig['additional_heads'];
	
	res.send(`
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset=utf8 />
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
			${hostconfig.use_external_css ? `
				<link rel=stylesheet href="https://theseed.io/css/diffview.css">
				<link rel=stylesheet href="https://theseed.io/css/katex.min.css">
				<link rel=stylesheet href="https://theseed.io/css/wiki.css">
			` : `
				<link rel=stylesheet href="/css/diffview.css">
				<link rel=stylesheet href="/css/katex.min.css">
				<link rel=stylesheet href="/css/wiki.css">
			`}
			${hostconfig.use_external_js ? `
				<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="https://theseed.io/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
				<!--[if lt IE 9]><script type="text/javascript" src="https://theseed.io/js/jquery-1.11.3.min.js"></script><![endif]-->
				<script type="text/javascript" src="https://theseed.io/js/dateformatter.js?508d6dd4"></script>
				<script type="text/javascript" src="https://theseed.io/js/intersection-observer.js?36e469ff"></script>
				<script type="text/javascript" src="https://theseed.io/js/theseed.js?24141115"></script>
				
			` : `
				<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
				<!--[if lt IE 9]><script type="text/javascript" src="/js/jquery-1.11.3.min.js"></script><![endif]-->
				<script type="text/javascript" src="/js/dateformatter.js?508d6dd4"></script>
				<script type="text/javascript" src="/js/intersection-observer.js?36e469ff"></script>
				<script type="text/javascript" src="/js/theseed.js?24141115"></script>
			`}
				${header}
			</head>
			
			<body>
				${ver('4.16.0') ? `<h1 class=title>${html.escape(doc + '')}</h1>` : ''}
				<div class=wiki-article style="background-color: white;">
					${await markdown(req, req.body['text'], 0, doc + '', 'preview')}
				</div>
			</body>
		</html>
	`);
});

if(ver('4.20.0')) router.post(/^\/commentpreview$/, async(req, res) => {
	const { id } = req.body;
	
	var content = ``;
	content += `
		<div style="border: none; margin: 0; padding: 0;" class=res-wrapper data-id="${id}">
			<div class="res res-type-normal">
				<div class="r-head">
					<span class=num>
						<a id="">#${id}</a>&nbsp;
					</span> ${ip_pas(ip_check(req), islogin(req) ? 'author' : 'ip', 1).replace('<a ', hasperm(req, 'admin') ? '<a style="font-weight: bold;" ' : '<a ')}${islogin(req) && await userblocked(ip_check(req)) ? ` <small>(${ver('4.11.3') ? '차단됨' : '차단된 사용자'})</small>` : ''}${!islogin(req) && await ipblocked(ip_check(req)) ? ` <small>(${ver('4.11.3') ? '차단됨' : '차단된 아이피'})</small>` : ''} <span class=pull-right>${generateTime(toDate(getTime()), timeFormat)}</span>
				</div>
				
				<div class="r-body">
					${await markdown(req, req.body['text'], 1, '', 'preview')}
				</div>
			</div>
		</div>
	`;
	
	res.send(content);
});