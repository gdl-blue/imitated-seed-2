<div id="top"></div>
<div class="nav-wrapper navbar-fixed-top">
    <nav class="navbar navbar-dark">
        <a class="navbar-brand" href="/"></a>
        <ul class="nav navbar-nav">
            <li class="nav-item">
                <a class="nav-link" href="/RecentChanges"><span class="fa fa-refresh"></span><span class="hide-title">최근바뀜</span></a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/RecentDiscuss"><span class="fa fa-comments"></span><span class="hide-title">최근토론</span></a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/random"><span class="fa fa-random"></span><span class="hide-title">임의문서</span></a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle dropdown-toggle-fix" href="#" data-toggle="dropdown" aria-expanded="false">
                    <span class="fa fa-gear"></span><span class="hide-title">도구</span>
                </a>
                <div class="dropdown-menu" role="menu">
                    <a href="/NeededPages" class="dropdown-item">작성이 필요한 문서</a>
                    <a href="/OrphanedPages" class="dropdown-item">고립된 문서</a>
                    <a href="/OldPages" class="dropdown-item">편집된 지 오래된 문서</a>
                    <a href="/ShortestPages" class="dropdown-item">내용이 짧은 문서</a>
                    <a href="/LongestPages" class="dropdown-item">내용이 긴 문서</a>
                    <a href="/BlockHistory" class="dropdown-item">차단 내역</a>
                    <a href="/RandomPage" class="dropdown-item">RandomPage</a>
                    <a href="/Upload" class="dropdown-item">업로드</a>
                    <a href="/License" class="dropdown-item">라이선스</a>
                    {%if perms.has('ipacl') %}
                        <a href="/admin/ipacl" class="dropdown-item">[관리] IPACL</a>
                    {% endif %}
                    {%if perms.has('suspend_account') %}
                        <a href="/admin/suspend_account" class="dropdown-item">[관리] 계정 차단</a>
                    {% endif %}
                    {%if perms.has('grant') %}
                        <a href="/admin/grant" class="dropdown-item">[관리] 권한 부여</a>
                    {% endif %}
                    {%if perms.has('login_history') %}
                        <a href="/admin/login_history" class="dropdown-item">[관리] 로그인 기록 조회</a>
                    {% endif %}
                </div>
            </li>
        </ul>
        <div class="navbar-login">
            {% if member %}
                <div class="dropdown login-menu">
                    <a class="dropdown-toggle" type="button" id="login-menu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <img class="profile-img" src="{{ member|avatar_url }}">
                    </a>
                    <div class="dropdown-menu dropdown-menu-right login-dropdown-menu" aria-labelledby="login-menu">
                        <a href="/w/{{ member.username | encode_userdoc }}" class="dropdown-item">{{ member.username }}</a>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item" href="/contribution/author/{{ member.username }}/document">내 문서 기여 목록</a>
                        <a class="dropdown-item" href="/contribution/author/{{ member.username }}/discuss">내 토론 기여 목록</a>
                        <div class="dropdown-divider"></div>
                        <a href="/member/mypage" class="dropdown-item">내 정보</a>
                        <div class="dropdown-divider view-logout"></div>
                        <a href="/member/logout?redirect={{ url | url_encode }}" class="dropdown-item view-logout">로그아웃</a>
                    </div>
                </div>
                <a href="/member/logout?redirect={{ url | url_encode }}" class="hide-logout logout-btn"><span class="fa fa-sign-out"></span></a>
            {% else %}
                <a href="/member/login?redirect={{ url | url_encode }}" class="none-outline">
                    <span class="fa fa-sign-in"></span>
                </a>
            {% endif %}
        </div>
        <div id="pt-notifications" class="navbar-notification">
            <a href="#"><span class="label label-danger"></span></a>
        </div>
        <form id="searchform" class="form-inline">
            <div class="input-group">
                <input type="search" name="q" placeholder="검색" accesskey="f" class="form-control" id="searchInput" autocomplete="off">
                <span class="input-group-btn">
                    <button type="submit" name="go" value="보기" id="searchGoButton" class="btn btn-secondary"><span class="fa fa-eye"></span></button>
                    <button type="submit" name="fulltext" value="검색" id="searchSearchButton" class="btn btn-secondary"><span class="fa fa-search"></span></button>
                </span>
            </div>
        </form>
    </nav>
</div>
<div class="content-wrapper">
    <div class="liberty-sidebar">
        <div class="liberty-right-fixed">
            <div class="live-recent">
                <div class="live-recent-header">
                    <ul class="nav nav-tabs">
                        <li class="nav-item">
                            <a class="nav-link active" id="liberty-recent-tab1">최근바뀜</a>
                        </li>
                    </ul>
                </div>
                <div class="live-recent-content">
                    <ul class = "live-recent-list" id="live-recent-list">
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                        <li><span class="recent-item">&nbsp;</span></li>
                    </ul>
                </div>
                <div class="live-recent-footer">
                    <a href="/RecentChanges" title="최근 변경내역"><span class="label label-info">더보기</span></a>
                </div>
            </div>
        </div>
    </div>
    <div class="container-fluid liberty-content">
        <div class="liberty-content-header">
            {% if document %}
                <div class="content-tools">
                    <div class="btn-group" role="group" aria-label="content-tools">
                        <a href="/w/{{ document|encode_doc }}" class="btn btn-secondary tools-btn">문서</a>
                        <a href="/edit/{{ document|encode_doc }}" class="btn btn-secondary tools-btn">편집</a>
                        <a href="/discuss/{{ document|encode_doc }}" class="btn btn-secondary tools-btn">토론</a>
                        <a href="/history/{{ document|encode_doc }}" class="btn btn-secondary tools-btn">기록</a>
                        <button type="button" class="btn btn-secondary tools-btn dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                            <span class="caret"></span>
                        </button>
                        <div class="dropdown-menu dropdown-menu-right" role="menu">
                            <a href="/xref/{{ document|encode_doc }}" class="dropdown-item">역링크</a>
                            <a href="/delete/{{ document|encode_doc }}" class="dropdown-item">삭제</a>
                            <a href="/move/{{ document|encode_doc }}" class="dropdown-item">이동</a>
                            <a href="/acl/{{ document|encode_doc }}" class="dropdown-item">ACL</a>
                            {% if user %}
                                <a href="/contribution/author/{{ document.title|url_encode }}/document" class="dropdown-item">기여내역</a>
                            {% endif %}
                        </div>
                    </div>
                </div>
            {% endif %}
            <div class="title">
                <h1>
                    {{ skinInfo.title }}
                </h1>
            </div>
        </div>
        <div class="liberty-content-main wiki-article">
            {% if user_document_discuss %}
                <div class="alert alert-info fade in" id="userDiscussAlert" role="alert" data-id="{{ member.username }}-{{ user_document_discuss }}">
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        <span class="sr-only">Close</span>
                    </button>
                    현재 진행중인 <a href="/discuss/{{ member.username | encode_userdoc }}">사용자 토론</a>이 있습니다.
                </div>
            {% endif %}
            {% block content %}
            {% endblock %}
        </div>
        <div class="liberty-footer" id="bottom">
            {% if skinInfo.viewName == 'wiki' and date %}
            <ul class="footer-info">
                <li class="footer-info-lastmod"> 이 문서는 {{ date | to_date | localdate('Y-m-d H:i:sO') }} 에 마지막으로 바뀌었습니다.</li>
                <li class="footer-info-copyright">{{ config.getString('wiki.copyright_text', '') }}</li>
            </ul>
            {% endif %}
            <ul class="footer-places">

            </ul>
            <ul class="footer-icons">
                <li class="footer-poweredbyico">
                    <a href="//gitlab.com/librewiki/Liberty-MW-Skin">Liberty</a> | <a href="//theseed.io/">the seed</a>
                </li>
            </ul>
        </div>
    </div>
</div>
<div class="modal" id="footnoteModal">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">각주:</h5>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-block" data-dismiss="modal">닫기</button>
            </div>
        </div>
    </div>
</div>
<div class="scroll-buttons">
    <a class="scroll-toc" href="#toc"><i class="fa fa-list-alt" aria-hidden="true"></i></a>
    <a class="scroll-button" href="#top" id="left"><i class="fa fa-arrow-up" aria-hidden="true"></i></a>
    <a class="scroll-bottom" href="#bottom" id="right"><i class="fa fa-arrow-down" aria-hidden="true"></i></a>
</div>
