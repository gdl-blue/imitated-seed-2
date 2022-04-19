더시드 엔진 4.12.0 모방 프로젝트.  
< "엔진 내부 UI는 상관없음." ( https://feedback.theseed.io/posts/280 ) >  
테스트 서버 - https://go2021.glitch.me

## 기초 사용 방법
- css, js 디렉토리를 만든다.
  - https://theseed.io/js/theseed.js, https://theseed.io/js/jquery-2.1.4.min.js, https://theseed.io/js/jquery-1.11.3.min.js, https://theseed.io/js/intersection-observer.js, https://theseed.io/js/dateformatter.js )를 각각 다운로드받아 js 디렉토리에 복사한다.
  - https://theseed.io/css/wiki.css, https://theseed.io/css/katex.min.css, https://theseed.io/css/diffview.css )를 각각 다운로드받아 css 디렉토리에 복사한다.
- skins 디렉토리를 만든다.
  - [buma](https://github.com/LiteHell/theseed-skin-buma/tree/d77eef50a77007da391c5082b4b94818db372417), [liberty](https://github.com/namuwiki/theseed-skin-liberty/tree/153cf78f70206643ec42e856aff8280dc21eb2c0) 등 원하는 스킨을 내려받고 skins 디렉토리에 스킨 이름으로 하위디렉토리를 만들어 복사한다.
- `npm i`를 실행한다.
- `node index`를 실행한다.

## 숨겨진 설정
- config.json 수정으로 숨겨진 설정을 제어할 수 있다.
  - `disable_email`: 전자우편 인증을 끈다.
  - `disable_login_history`: 로그인 내역을 기록하지 않게 한다.
  - `use_external_js`: theseed.js, jQuery 등을 [theseed.io](https://theseed.io)에서 불러온다.
  - `use_external_css`: wiki.css 등을 [theseed.io](https://theseed.io)에서 불러온다.
  - `allow_account_deletion`: 계정 탈퇴를 허용한다.
  - `theseed_version`: 문자열로 모방할 the seed 엔진의 버전을 지정한다. 예를 들어, "4.4.2"로 할 경우, v4.4.3에 추가된 쓰레드 주제/문서 변경 기능을 사용할 수 없고, "4.18.0"으로 할 경우 IPACL과 사용자 차단 기능이 비활성화되고 ACLGroup가 활성화되며 ACL에서 이름공간ACL 실행 action를 사용할 수 있다.
