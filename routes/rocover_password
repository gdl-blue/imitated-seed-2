//메일 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',  // Gmail
    port: 465,
    auth: {
      user: hostconfig.email,
      pass: hostconfig.passwd
    },
  });
  
  //라우터 설정
  router.all(/^\/member\/recover_password$/, async function signupEmailScreen(req, res, next) {
      if(!['GET', 'POST'].includes(req.method)) return next();
      
      var desturl = req.query['redirect'];
      if(!desturl) desturl = '/';
      
      if(islogin(req)) { res.redirect(desturl); return; }
      
      //이메일 필터
      var emailfilter = '';
      if(config.getString('wiki.email_filter_enabled', 'false') == 'true') {
          emailfilter = `
              <p>이메일 허용 목록이 활성화 되어 있습니다.<br />이메일 허용 목록에 존재하는 메일만 사용할 수 있습니다.</p>
              <ul class=wiki-list>
          `;
          for(var item of await curs.execute("select address from email_filters")) {
              emailfilter += '<li>' + item.address + '</li>';
          }
          emailfilter += '</ul>';
      }
      
      var bal = '';
      var error = null;
      
      if(hostconfig.disable_email) req.body['email'] = '';

      if(req.method == 'POST') do {
        var blockmsg = await ipblocked(ip_check(req, 1));
        if(blockmsg) break;
        if(!hostconfig.disable_email && (!req.body['email'] || req.body['email'].match(/[@]/g).length != 1)) {
            var invalidemail = 1;
            break;
        }
        var data = await curs.execute("select email from recover_account where email = ?", [req.body['email']]);
      if(!hostconfig.disable_email && data.length) {
          var duplicate = 1;
          break;
      }
        var data = await curs.execute("select value from user_settings where key = 'email' and value = ?", [req.body['email']]);
        if(!hostconfig.disable_email && data.length) {
            var userexist = 1;
            break;
        }
        if(emailfilter) {
            var data = await curs.execute("select address from email_filters where address = ?", [req.body['email'].split('@')[1]]);
            if(!hostconfig.disable_email && !data.length) {
                var filteredemail = 1;
                break;
            }
        }
    } while(0);
      
      var content = `
          ${req.method == 'POST' && !error && filteredemail ? (error = err('alert', { msg: '이메일 허용 목록에 있는 이메일이 아닙니다.' })) : ''}
          ${req.method == 'POST' && !error && blockmsg ? (error = err('alert', { msg: blockmsg })) : ''}
  
          <form method=post class=signup-form>
                  ${req.method == 'POST' && !error && duplicate ? (error = err('alert', { msg: '이메일 인증이 이미 진행 중입니다.' })) : ''}
                  ${req.method == 'POST' && !error && userexist ? '' : (error = err('alert', { msg: '회원정보가 없습니다.' }))}
                  ${req.method == 'POST' && !error && invalidemail ? (error = err('alert', { msg: '이메일의 값을 형식에 맞게 입력해주세요.' })) : ''}
              <div class=form-group>
              <label>${ver('4.13.0') ? '이메일' : '전자우편 주소'}</label>
                  ${hostconfig.disable_email ? `
                      <input type=hidden name=email value="" />
                      <div>이메일이 비활성화 되었기때문에 사용할 수 없는기능입니다.</div>
                  ` : `<input type=email name=email class=form-control />
                      <div class=btns>
                      <button type=submit class="btn btn-primary">찾기</button>
                      </div>
                  `}
              </div>
          </form>
      `;
      
      if(req.method == 'POST' && !error) {
          const { email } = req.body;
          var data = await curs.execute("select username from users where email = ?", [req.body['email']]);
          var username = data[0].username;
          
          //키
          await curs.execute("delete from recover_account where cast(time as integer) < ?", [Number(getTime()) - 86400000]);
          const key = rndval('abcdef1234567890', 64);
          //db저장
          curs.execute("insert into recover_account (key, username, email, time) values (?, ?, ?, ?)", [key, username, req.body['email'], String(getTime())]);
  
          //이메일 사용 안하면
          if(hostconfig.disable_email) return res.redirect('/');
  
          //사용하면
          else {
              //메일 발송
              const mailOptions = {
              from: [config.getString('wiki.site_name')] + '<' + [email] + '>',
              to: [email] ,
              subject: '[' + [config.getString('wiki.site_name')] + ']' + +' '+ [username] + '님의 아이디/비밀번호 찾기 메일 입니다.',
              html: `
                  <p>안녕하세요. ${config.getString('wiki.site_name')} 입니다.</p>
                  <p>${username} 님의 아이디/비밀번호 찾기 메일입니다. 해당 계정의 비밀번호를 찾으시려면 아래 링크를 클릭해주세요.</p>
                  <a href="http://${config.getString('wiki.canonical_url')}/member/recover_password/${key}">[인증]</a>
                  <p>이 메일은 24시간동안 유효합니다.</p>
                  <p>요청 아이피: ${ip_check(req)}</p>
              `,};
  
              transporter.sendMail(mailOptions);
              console.log(email+'으로 계정 복구메일 발송됨.');
              //완료
              return res.send(await render(req, '계정 찾기', `
              <p>
                  이메일(<strong>${req.body['email']}</strong>)로 계정 찾기 인증 메일을 전송했습니다. 메일함에 도착한 메일을 통해 인증을 완료해 주시기 바랍니다.
              </p>
  
              <ul class=wiki-list>
                  <li>간혹 메일이 도착하지 않는 경우가 있습니다. 이 경우, 스팸함을 확인해주시기 바랍니다.</li>
                  <li>인증 메일은 24시간동안 유효합니다.</li>
              </ul>
              
              
          `, {}));
          }
      }
      res.send(await render(req, '계정 찾기', content, {}, _, error, 'signup'));
  });
  
  router.all(/^\/member\/recover_password\/(.*)$/, async function signupScreen(req, res, next) {
      if(!['GET', 'POST'].includes(req.method)) return next();
      
      await curs.execute("delete from recover_account where cast(time as integer) < ?", [Number(getTime()) - 86400000]);
      
      const key = req.params[0];
      var data = await curs.execute("select username from recover_account where key = ?", [key]);
      var username = data[0].username;

      var desturl = req.query['redirect'];
      if(!desturl) desturl = '/';
      
      if(islogin(req)) { res.redirect(desturl); return; }
      
      var pw = '1', pw2 = '1';
      
      var content = '';
      var error = null;

      if(req.method == 'POST' && !error) do {
        const pw = req.body['password'] || '';
        const pw2 = req.body['password_check'] || '';
        await curs.execute("update users set password = ? where username = username", [sha3(req.body['password'])]);
        await curs.execute("delete from recover_account where key = ?", [req.body['key']]);
        return res.redirect('/member/login');
    } while(0);

      content = `
          <form class=signup-form method=post>         
            <p><strong>새로운 비밀번호를 입력해주세요</strong></p>
              <div class=form-group>
                  <label>비밀번호</label>
                  <input class=form-control name="password" type="password" />
                  ${req.method == 'POST' && !error && !pw.length ? (error = err('p', { code: 'validator_required', tag: 'password' })) : ''}
              </div>
  
              <div class=form-group>
                  <label>비밀번호 확인</label>
                  <input class=form-control name="password_check" type="password" />
                  ${req.method == 'POST' && !error && !pw2.length ? (error = err('p', { code: 'validator_required', tag: 'password_check' })) : ''}
                  ${req.method == 'POST' && !error && pw2 != pw ? (error = err('p', { msg: '암호 확인이 올바르지 않습니다.' })) : ''}
              </div>
              <div class=btns>
                  <button type=reset class="btn btn-secondary">초기화</button>
                  <button type=submit class="btn btn-primary">변경</button>
              </div>
          </form>
      `;

    res.send(await render(req, '계정 찾기', content, {}, _, error, 'recover_password'));
  });
