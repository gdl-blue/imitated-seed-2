/* 드롭다운 페이드인 */
jQuery('.dropdown').on('show.bs.dropdown', function(e) {
    jQuery(this).find('.dropdown-menu').first().stop(true, true).fadeToggle(200);
});

jQuery('.dropdown').on('hide.bs.dropdown', function(e) {
    jQuery(this).find('.dropdown-menu').first().stop(true, true).fadeToggle(200);
});

jQuery('.btn-group').on('show.bs.dropdown', function(e) {
    jQuery(this).find('.dropdown-menu').first().stop(true, true).fadeToggle(200);
});

jQuery('.btn-group').on('hide.bs.dropdown', function(e) {
    jQuery(this).find('.dropdown-menu').first().stop(true, true).fadeToggle(200);
});
/* 드롭다운 페이드인 End */

/* 문단 왼쪽에 접힘 여부를 알려주는 화살표 추가 */
$(".wiki-heading").each(function () {
    // NOTE : 처음 모든 문단을 접는 설정은 리버티 스킨에 없기 때문에 고려하지 않음.
    $(this).prepend('<a class="wiki-heading-arrow"><i class="fa fa-chevron-down"></i></a> ')
        .find(".wiki-heading-arrow")
        .click(function (e) {
            e.preventDefault();
        });
})

$(".wiki-heading").click(function (e) {
    if (e.target.tagName === 'A') return;
    var paragraph = $(this).next();
    if (paragraph.is(':visible')) {
        $(this).find(".wiki-heading-arrow i").addClass("fa-chevron-down").removeClass("fa-chevron-up")
    } else {
        $(this).find(".wiki-heading-arrow i").addClass("fa-chevron-up").removeClass("fa-chevron-down")
    }
});
/* 문단 왼쪽에 접힘 여부를 알려주는 화살표 추가  END*/