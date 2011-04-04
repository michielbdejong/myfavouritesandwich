  ///////////////
 // WebFinger //
///////////////

var WebFinger = function() {
	var webFinger = {};
	var getHostMeta = function(userName) {
		//split the userName at the "@" symbol:
		var parts = userName.split("@");
		if(parts.length == 2) {
			var user = parts[0];
			var domain = parts[1];

			//get the host-meta data for the domain:
			var xhr = new XMLHttpRequest();
			var url = "http://"+domain+"/.well-known/host-meta?format=json";
			xhr.open("GET", url, false);	
			xhr.send();
			if(xhr.status == 200) {
				return JSON.parse(xhr.responseText);
			}
		}
		return null;
	}
	webFinger.getDavDomain = function(userName) {
		//get the WebFinger data for the user and extract the uDAVdomain:
		var hostMeta = getHostMeta(userName);
		if(hostMeta && hostMeta.links && hostMeta.links.lrdd && hostMeta.links.lrdd.length && hostMeta.links.lrdd[0].template) {
			var template = hostMeta.links.lrdd[0].template;
			var xhr = new XMLHttpRequest();
			var url = template.replace("\{uri\}", "acct:"+userName, true);
			xhr.open("GET", url, false);
			xhr.send();
			if(xhr.status == 200) {
				return JSON.parse(xhr.responseText).links["http:\/\/unhosted.org\/spec\/DAV\/"];
			}
		}
		return null;
	}
	webFinger.getAdminUrl = function(userName) {
		var fromHostMeta = getHostMeta(userName);
		if(fromHostMeta && fromHostMeta.links && fromHostMeta.links.register) {
			return fromHostMeta.links.register[0].template.replace("\{uri\}",userName).replace("\{redirect_url\}", window.location);
		} else {
			return null;
		}
	}
	return webFinger;
}


  ///////////////
 // OAuth2-cs //
///////////////

var OAuth = function () {
	var oAuth = {}
	oAuth.dance = function(oAuthDomain, userName, app) {
		window.location = oAuthDomain
					+"oauth2/auth"
					+"?client_id="+app
					+"&redirect_uri="+app
					+"&scope=dav"
					+"&response_type=token"
					+"&user_name="+userName;
	}
	oAuth.revoke = function() {
		localStorage.removeItem("OAuth2-cs::token");
	}
	//receive incoming OAuth token, if present:
	oAuth.receiveToken = function() {
		var regex = new RegExp("[\\?&]token=([^&#]*)");
		var results = regex.exec(window.location.href);
		if(results) {
			localStorage.setItem("OAuth2-cs::token", results[1]);
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
	var makeBasicAuth = function(user, password) {
		var tok = user + ':' + password;
		var hash = Base64.encode(tok);
		return "Basic " + hash;
	}
	dav.get = function(key) {
		var xhr = new XMLHttpRequest();
		var url = localStorage.getItem("unhosted::davDomain")
			+"webdav/"
			+localStorage.getItem("unhosted::userName").replace("@", "/")
			//+"/"+document.domain+
			+"/"+"www.myfavouritesandwich.org"
			+"/"+key;
		xhr.open("GET", url, false);
		xhr.setRequestHeader("Authorization", makeBasicAuth(localStorage.getItem("unhosted::userName"), localStorage.getItem("OAuth2-cs::token")));
		xhr.withCredentials = "true";
		xhr.send();
		if(xhr.status == 200) {
			return JSON.parse(xhr.responseText);
		} else {
			alert("error: got status "+xhr.status+" when doing basic auth GET on URL "+url);
		}
	}
	dav.put = function(key, value) {
		var text = JSON.stringify(value);
		var xhr = new XMLHttpRequest();
		var url = localStorage.getItem("unhosted::davDomain")
			+"webdav/"
			+localStorage.getItem("unhosted::userName").replace("@", "/")
			//+"/"+document.domain+
			+"/"+"www.myfavouritesandwich.org"
			+"/"+key;
		xhr.open("PUT", url, false);
		xhr.setRequestHeader("Authorization", makeBasicAuth(localStorage.getItem("unhosted::userName"), localStorage.getItem("OAuth2-cs::token")));
		xhr.withCredentials = "true";
		xhr.send(text);
		if(xhr.status != 200 && xhr.status != 204) {
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
	unhosted.dav = DAV();

	unhosted.setUserName = function(userName) {
		if(userName == null) {
			localStorage.removeItem("unhosted::userName");
			localStorage.removeItem("unhosted::davDomain")
			OAuth().revoke();
		} else {
			localStorage.setItem("unhosted::userName", userName);
			var davDomain = WebFinger().getDavDomain(userName);
			if(davDomain != null) {
				localStorage.setItem("unhosted::davDomain", davDomain);
				OAuth().dance(davDomain, userName, document.domain);
			}
		}
	}

	unhosted.getUserName = function() {
		if(localStorage.getItem("OAuth2-cs::token")) {
			return localStorage.getItem("unhosted::userName").trim();
		}
		return null;
	}

	unhosted.register = function(userName) {
		var registerUrl = WebFinger().getAdminUrl(userName);
		if(registerUrl) {
			window.location = registerUrl;
		} else {
			var parts = userName.split("@");
			if(parts.length == 2) {
				//alert the sys admin about the error through a 404 message to her website:
				var xhr = new XMLHttpRequest();
				var url = "http://www."+parts[1]+"/unhosted-account-failure/?user="+userName;
				xhr.open("GET", url, true);
				xhr.send();

				//inform the user:
				return "Unhosted account not found! Please alert an IT hero at "
					+parts[1]
					+" about this. For alternative providers, see http://www.unhosted.org/";
			} else {
				return "Please use one '@' symbol in the user name";
			}
		}
	}

	return unhosted;
}
