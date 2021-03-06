/*==================================================
 *  Simile Exhibit API
 *
 *  Include Exhibit in your HTML file as follows:
 *    <script src="http://static.simile.mit.edu/exhibit/api-2.0/exhibit-api.js" type="text/javascript"></script>
 *
 *==================================================
 */

console.log("== exhibit-api.js ==");
(function() {
    var isCompiled = ("Exhibit_isCompiled" in window) && window.Exhibit_isCompiled;
    
    var useLocalResources = false;
    var noAuthentication = false;
    

    if (document.location.search.length > 0) {
        var params = document.location.search.substr(1).split("&");
        for (var i = 0; i < params.length; i++) {
            if (params[i] == "exhibit-use-local-resources") {
                useLocalResources = true;
            }
            if (params[i] == 'exhibit-no-authentication') {
                noAuthentication = true;
            }
        }
    }

    var loadMe = function() {
        if (typeof window.Exhibit != "undefined") {
            return;
        }
    
        window.Exhibit = {
            version:    "2.2.0",
            loaded:     false,
            params:     { bundle: !useLocalResources, authenticated: !noAuthentication, autoCreate: false, safe: false },
            namespace:  "http://simile.mit.edu/2006/11/exhibit#",
            importers:  {},
            locales:    [ "en" ]
        };
    
        var includeMap = false;
        var includeTimeline = false;
        
        var defaultClientLocales = ("language" in navigator ? navigator.language : navigator.browserLanguage).split(";");
        for (var l = 0; l < defaultClientLocales.length; l++) {
            var locale = defaultClientLocales[l];
            if (locale != "en" && locale != "en-US") {
                var segments = locale.split("-");
                if (segments.length > 1 && segments[0] != "en") {
                    Exhibit.locales.push(segments[0]);
                }
                Exhibit.locales.push(locale);
            }
        }

        var paramTypes = { bundle:Boolean, js:Array, css:Array, autoCreate:Boolean, safe:Boolean };
        if (typeof Exhibit_urlPrefix == "string") {
            Exhibit.urlPrefix = Exhibit_urlPrefix;
            if ("Exhibit_parameters" in window) {
                SimileAjax.parseURLParameters(Exhibit_parameters,
                                              Exhibit.params,
                                              paramTypes);
            }
        } else {
            var url = SimileAjax.findScript(document, "/exhibit-api.js");
            if (url == null) {
                Exhibit.error = new Error("Failed to derive URL prefix for Simile Exhibit API code files");
                return;
            }
            Exhibit.urlPrefix = url.substr(0, url.indexOf("exhibit-api.js"));
        
            SimileAjax.parseURLParameters(url, Exhibit.params, paramTypes);
        }
        
        /*
         * Enable logging
         */
        if (Exhibit.params.log == true) {
            SimileAjax.RemoteLog.logActive = true;
            SimileAjax.RemoteLog.url = SimileAjax.RemoteLog.defaultURL;
            if (Exhibit.params.logServer) {
                SimileAjax.RemoteLog.url = Exhibit.params.logServer;                
            }

            var dat = {"action":"ExhibitLoad"};
            for (k in Exhibit.params) {
                dat[k] = "" + Exhibit.params[k];
            }
            SimileAjax.RemoteLog.possiblyLog(dat);
        }
        
        if (useLocalResources) {
            Exhibit.urlPrefix = "http://127.0.0.1:8888/exhibit/api/";
        }
        if (Exhibit.params.locale) { // ISO-639 language codes,
            // optional ISO-3166 country codes (2 characters)
            if (Exhibit.params.locale != "en") {
                var segments = Exhibit.params.locale.split("-");
                if (segments.length > 1 && segments[0] != "en") {
                    Exhibit.locales.push(segments[0]);
                }
                Exhibit.locales.push(Exhibit.params.locale);
            }
        }
        if (Exhibit.params.gmapkey) {
            includeMap = true;
        }
        if (Exhibit.params.views) {
            var views = Exhibit.params.views.split(",");
            for (var j = 0; j < views.length; j++) {
                var view = views[j];                
                if (view == "timeline") {
                    includeTimeline = true;
                } else if (view == "map") {
                    includeMap = true;
                }
            }
        }

        var scriptURLs = Exhibit.params.js || [];
                
        /*
         *  Core scripts and styles
         */
        if (Exhibit.params.bundle) {
            scriptURLs.push(Exhibit.urlPrefix + "exhibit-bundle.js");
        } else {
        }
        
        /*
         *  Localization
         */
        for (var i = 0; i < Exhibit.locales.length; i++) {
            scriptURLs.push(Exhibit.urlPrefix + "locales/" + Exhibit.locales[i] + "/locale.js");
        };
        
        if (Exhibit.params.callback) {
            window.SimileAjax_onLoad = function() {
                eval(Exhibit.params.callback + "()");
            }
        } else if (Exhibit.params.autoCreate) {
            scriptURLs.push(Exhibit.urlPrefix + "scripts/create.js");
        }

        /*
         *  Extensions (for backward compatibility)
         */
        if (!isCompiled) {
            SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        }
        
        Exhibit.loaded = true;
    };

    /*
     *  Load SimileAjax if it's not already loaded
     */
        loadMe();
})();

