var nevermind = function() {};
var nvm = nevermind;
function isVisible(elmt) {
    if(typeof ActiveXObject == 'function') return true;

    var top = elmt.offsetTop;
    var left = elmt.offsetLeft;
    var width = elmt.offsetWidth;
    var height = elmt.offsetHeight;

    while(elmt.offsetParent) {
        elmt = elmt.offsetParent;
        top += elmt.offsetTop;
        left += elmt.offsetLeft;
    }

    return (
        top < (pageYOffset + innerHeight) &&
        left < (pageXOffset + innerWidth) &&
        (top + height) > pageYOffset &&
        (left + width) > pageXOffset
    );
}

var allLoadingRes = 'div#res-container div.res-wrapper.res-loading';
var loadingRes = allLoadingRes + '[data-visible="true"]';
var loadingRes2 = loadingRes + '[data-locked="false"]';

function setVisibleState() {
	$(allLoadingRes).each(function() {
		var item = $(this);
		if(isVisible(item[0])) {
			item.attr('data-visible', 'true');
		} else {
			item.attr('data-visible', 'false');
		}
	});
};

function atoi(exp) {
    return Number(exp);
}

function itoa(exp) {
    return String(exp);
}

function fetchComments(tnum) {
	setVisibleState();

	if($(loadingRes2).length) {
		var loadingID = $(loadingRes2)[0].getAttribute('data-id');
		$(loadingRes2).attr('data-locked', 'true');
		window.status = '#' + loadingID + '번 댓글을 불러오는 중...';

		$.ajax({
			type: "GET",
			url: '/thread/' + tnum + '/' + loadingID,
			dataType: 'html',
			success: function(d) {
				var data = $(d);

				data.filter('div.res-wrapper').each(function() {
					var itm = $(this);
					var res = $('div.res-wrapper.res-loading[data-id="' + itm.attr('data-id') + '"]');
					window.status = '#' + itm.attr('data-id') + '번 댓글을 불러오는 중...';
					res.after(itm).remove();
					itm.find('time').each(function () {
						$(this).html(formatDate(new Date($(this).attr('datetime')), $(this).attr('data-format')));
					});
				});
				
				window.status = '완료';
			},
			error: function(e) {
			}
		});
	}
}

function discussPollStart(tnum) {
	$('form#new-thread-form').submit(function() {
		var frm = $(this);
		var submitBtn = $('form#new-thread-form').find('button[type="submit"]');
		submitBtn.attr('disabled', '');
		
		if(!($('textarea[name="text"]').val())) {
			submitBtn.removeAttr('disabled');
			return false;
		}
		
		$.ajax({
			type: "POST",
			dataType: 'json',
			data: {
				'text': $('textarea[name="text"]').val()
			},
			success: function(d) {
				submitBtn.removeAttr('disabled');
				$('textarea[name="text"]').val("");
			},
			error: function(t) {
				submitBtn.removeAttr('disabled');
				alert(t && t.responseJSON && t.responseJSON.status ? t.responseJSON.status : '문제가 발생했습니다!');
			}
		});

		return false;
	});

	$('form#thread-status-form').submit(function() {
		var submitBtn = $(this).find('button[type="submit"]');
		submitBtn.attr('disabled', '');

		$.ajax({
			type: "POST",
			dataType: 'json',
			data: $(this).serialize(),
			url: '/admin/thread/' + tnum + '/status',
			success: function(d) {
				location.href = location.pathname;
			},
			error: function(d) {
				alert('문제가 발생했습니다!');
			}
		});

		return false;
	});


	$('form#thread-document-form').submit(function() {
		var submitBtn = $(this).find('button[type="submit"]');
		submitBtn.attr('disabled', '');

		$.ajax({
			type: "POST",
			dataType: 'json',
			data: $(this).serialize(),
			url: '/admin/thread/' + tnum + '/document',
			success: function(d) {
				location.href = location.pathname;
			},
			error: function(d) {
				alert('문제가 발생했습니다!');
			}
		});

		return false;
	});

	$('form#thread-topic-form').submit(function() {
		var submitBtn = $(this).find('button[type="submit"]');
		submitBtn.attr('disabled', '');

		$.ajax({
			type: "POST",
			dataType: 'json',
			data: $(this).serialize(),
			url: '/admin/thread/' + tnum + '/topic',
			success: function(d) {
				location.href = location.pathname;
			},
			error: function(d) {
				alert('문제가 발생했습니다!');
			}
		});

		return false;
	});

	function ref() {
		$.ajax({
			type: "POST",
			url: '/notify/thread/' + tnum,
			dataType: 'json',
			success: function(data) {
				var tid = atoi(data['comment_id']);
				var rescount = $('#res-container div.res-wrapper').length;
				if(rescount < tid) {
					window.status = '새로운 댓글 ' + (tid - rescount) + '개가 있습니다.';
				}

				for(var i=rescount+1; i<=tid; i++, rescount++) {
					$('div.res-wrapper[data-id="' + itoa(rescount) + '"]').after($(
						'<div class="res-wrapper res-loading" data-id="' + itoa(i) + '" data-locked=false data-visible=false>' +
						'<div class="res res-type-normal">' +
						'<div class="r-head">' +
						'<span class="num"><a id="' + itoa(i) + '">#' + itoa(i) + '</a>&nbsp;</span>' +
						'</div>' +
						'' +
						'<div class="r-body"></div>' +
						'</div>' +
						'</div>'
					));
				}

				setVisibleState();
			},
			error: nevermind
		});

		fetchComments(tnum);
	}
	var refresher = setInterval(ref, 2000);
	ref();
}
          
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
window.discussPollStart = discussPollStart;
setTimeout(() => window.discussPollStart = discussPollStart, 1);
setTimeout(() => window.discussPollStart = discussPollStart, 2);
setTimeout(() => window.discussPollStart = discussPollStart, 3);

