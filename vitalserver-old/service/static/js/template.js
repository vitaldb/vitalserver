var isMobile = {	
	Android: function() {	
		return navigator.userAgent.match(/Android/i);	
	},	
	BlackBerry: function() {	
		return navigator.userAgent.match(/BlackBerry/i);	
	},	
	iOS: function() {	
		return navigator.userAgent.match(/iPhone|iPad|iPod/i);	
	},	
	Opera: function() {	
		return navigator.userAgent.match(/Opera Mini/i);	
	},	
	Windows: function() {	
		return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);	
	},	
	any: function() {	
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());	
	}	
}	
var is_mobile = isMobile.any();

$(document).ready(function() {
    $('#alertModal').on('show.bs.modal', function(event) {
        var target = $(event.relatedTarget);
        var modal = $(this);
        modal.find('.modal-body').text(target.data('message'));
    });

    $('#confirmModal').on('show.bs.modal', function(event) {
        var target = $(event.relatedTarget);
        var modal = $(this);
        modal.find('.modal-body').text(target.data('message'));
        var action = target.data('action');
        if (action) {
            modal.find('.modal-footer form').prop('action', action).prop('method', 'POST');
        }
        var href = target.data('href');
        if (href)
            modal.find('.modal-footer form').prop('action', href).prop('method', 'GET');
    });

    if(is_mobile){
		$("#tabs").css("font-size", "13px");
		$("#tabs").css("padding-left", ".7rem");
		$(".nav-link").css("padding", ".5rem .7rem");
		$("#doc").css("height", "");
		$("#doc").css("overflow", "");
	}
});
