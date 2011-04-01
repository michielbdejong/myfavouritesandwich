  ///////////////
 // WebFinger //
///////////////

var WebFinger = function() {
	var webFinger = {};
	webFinger.getDavDomain = function(userName) {
		//split the userName at the "@" symbol:
		var parts = userName.split("@");
		var user = parts[0];
		var domain = parts[1];

		//get the host-meta data for the domain:
	        var xhr1 = new XMLHttpRequest();
		var url1 = "http://"+domain+"/.well-known/host-meta?format=json";
		xhr1.open("GET", url1, false);	
		xhr1.send();
		if(xhr1.status != 200) {
			return null;
		}

		//get the WebFinger data for the user and extract the uDAVdomain:
		var template = JSON.parse(xhr1.responseText).links.lrdd[0].template;
		var xhr2 = new XMLHttpRequest();
		var url2 = template.replace("{uri}", "acct:"+userName, true);
		xhr2.open("GET", url2, false);
		xhr2.send();
		if(xhr2.status != 200) {
			return null;
		}
		return JSON.parse(xhr2.responseText).links["http:\/\/unhosted.org\/spec\/DAV\/"];
	}
	return webFinger;
}


  ///////////////
 // OAuth2-cs //
///////////////

var OAuth = function () {
	var oAuth = {}
	oAuth.dance = function(oAuthDomain, userName, nameSpace) {
		window.location = davDdomain
					+"oauth2/auth"
					+"?client_id="+app
					+"&redirect_uri="+app
					+"&scope=dav"
					+"&response_type=token"
					+"&user_name="+userName;
	}
	//receive incoming OAuth token, if present:
	oAuth.receiveToken = function() {
		var regex = new RegExp("[\\?&]token=([^&#]*)");
		var results = regex.exec(window.location.href);
		if(results) {
			localStorage.setItem("unhosted:token", results[1]);
			window.location = "/";
		}
	}
	return oAuth;
}
OAuth().receiveToken();


  /////////
 // DAV //
/////////

var DAV = function() {
	var dav = {}
	dav.get = function(key) {
		var xhr = new XMLHttpRequest();
		var url = "http://"+localStorage.getItem("unhosted::davDomain")+"/"+key;
		xhr.open("GET", url, false);
		xhr.setRequestHeader("Authorization", "Basic "+localStorage.getItem("unhosted::token"));
		xhr.withCredentials = "true";
		xhr.send();
		if(xhr.status == 200) {
			return JSON.parse(xhr.responseTest);
		} else {
			alert("error: got status "+xhr.status+" when doing basic auth GET on URL "+url);
		}
	}
	dav.put = function(key, value) {
		var text = JSON.stringify(value);
		var xhr = new XMLHttpRequest();
		var url = "http://"+localStorage.getItem("unhosted::davDomain")+"/"+key;
		xhr.open("PUT", url, false);
		xhr.setRequestHeader("Authorization", "Basic "+localStorage.getItem("unhosted::token"));
		xhr.withCredentials = "true";
		xhr.send(text);
		if(xhr.status != 200) {
			alert("error: got status "+xhr.status+" when doing basic auth PUT on URL "+url);
		}
	}
	return dav;
}


  //////////////
 // Unhosted //
//////////////

var Unhosted = function() {
	var unhosted = {};

	unhosted.setUserName = function(userName) {
		var davDomain = WebFinger().getDavDomain(userName);
		if(davDomain == null) {
			return null;
		}

		//save everything in local storage and dance OAuth2-cs:
		localStorage.setItem("unhosted::userName", userName);
		localStorage.setItem("unhosted::davDomain", davDomain);

		OAuth().dance(davDomain, userName, document.domain);
	}

	unhosted.getUserName = function() {
		if(localStorage.getItem("unhosted::token")) {
			return localStorage.getItem("unhosted::userName");
		} else {//not properly unlocked the DAV storage
			return null;
		}
	}

	unhosted.register = function(domain) {
		return "http://unhosted."+domain+"/register.html";
	}

	unhosted.dav = DAV();
	return unhosted;
}


  //////////////////////
 //  global instance //
//////////////////////

var unhosted = Unhosted();
