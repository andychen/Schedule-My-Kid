/******************************************************************************
 * Timegrid API
 *   This file will load all the necessary Javascript files to make a standard 
 *   Timegrid operate.
 *****************************************************************************/

console.log("== timegrid-api.js ==");
(function() {
    var loadMe = function() {
        if (typeof window.Timegrid != "undefined") {
            return;
        }
    
        window.Timegrid = {
            loaded:     false,
            params: { autoCreate: false, bundle: false },
            importers:  {}
        };
    
        var javascriptFiles = [
            "timegrid.js",
        
            "util/util.js",
            "util/debug.js",
            "util/date.js",
            "util/excanvas.pack.js",
            "util/jquery.dimensions.js", 
            "util/jquery.simile.js", 
            "util/jquery.corner.js",
            "util/jquery.prettybox.js",
            "util/dstructs/dstructs.js",
            
            "controls.js",
            "listeners.js",
            "grid.js",
            "themes.js",
            "labellers.js",
            
            "sources/default.js",
            "sources/recurring.js",
            
            "layouts/layout.js",
            "layouts/nmonth.js",
            "layouts/nday.js",
            "layouts/weekly.js",
            "layouts/monthly.js",
            "layouts/property.js"
        ];
        
        var locales = [  ];
        
        var defaultClientLocales = ("language" in navigator ? navigator.language : navigator.browserLanguage).split(";");
        for (var l = 0; l < defaultClientLocales.length; l++) {
            var locale = defaultClientLocales[l];
            var segments = locale.split("-");
            if (segments.length > 1) {
                locales.push(segments[0]);
            }
	    else {
		locales.push(locale);
	    }
        }
        if (!locales.length) { locales.push("en"); }
        
        var url = SimileAjax.findScript(document, "timegrid-api.js");
        if (url == null) {
            Timegrid.error = new Error("Failed to derive URL prefix for Simile Timegrid API code files");
            return;
        }
        Timegrid.urlPrefix = url.substr(0, url.indexOf("timegrid-api.js"));
        var paramTypes = { bundle: Boolean, autoCreate: Boolean };
        SimileAjax.parseURLParameters(url, Timegrid.params, paramTypes);
        
        /*
         *  Core scripts and styles
         */
            SimileAjax.includeJavascriptFiles(document, Timegrid.urlPrefix + "scripts/", javascriptFiles);
        
        /*
         *  Localization
         */
        var localeFiles = [];
        for (var i = 0; i < locales.length; i++) {
            localeFiles.push(locales[i] + "/locale.js");
        };
        SimileAjax.includeJavascriptFiles(document, Timegrid.urlPrefix + "locales/", localeFiles);
        if (Timegrid.params.autoCreate) { 
            SimileAjax.includeJavascriptFile(document, Timegrid.urlPrefix + "scripts/create.js");
        }
        Timegrid.loaded = true;
    };
    
        loadMe();
})();
