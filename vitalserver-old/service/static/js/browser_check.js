var isChromium = !!window.chrome;
var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
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

if(!isMobile.any() && !(isChromium || isFirefox)){
    $("#browser-check").removeClass("d-none");
}