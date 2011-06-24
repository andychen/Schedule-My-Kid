/*===================================================
 * Exhibit extensions
 *==================================================
 */
var debug = false;

Exhibit.Functions["building"] = {
    f: function(args) {
        var building = "";
        args[0].forEachValue(function(v) {
            building = v.split("-")[0];
            return true;
        });
        return new Exhibit.Expression._Collection([ building ],  "text");
    }
};

/*==================================================
 * Initialization
 *==================================================
 */


function onLoad() {
	SimileAjax.Debug.silent = true;
    
    var urls = [ ];
    var courseIDs = [ ];
    var query = document.location.search;
    if (query.length > 1) {
        var params = query.substr(1).split("&");
        for (var i = 0; i < params.length; i++) {
            var a = params[i].split("=");
            var name = a[0];
            var value = a.length > 1 ? decodeURIComponent(a[1]) : "";
            if (name == "courses") {
            	courseIDs = value.split(";");
				addCourses(courseIDs, urls);
            } else if (name == "debug") {
                debug = true;
            }
        }
    }
    urls.push("data/schema.js");
    urls.push("data/smk.js"); 

/*
    // pull necessary URLs from cookie, since window.database doesn't exist yet
	var elts = PersistentData.stored('picked-classes').toArray();
	for (var i = 0; i < elts.length; i++) {
		var course = elts[i].split('.')[0];
		if (course.length > 0)
			addCourses([course], urls);
	}
*/


    window.database = Exhibit.Database.create();
    
/* ===== fDone function ===== */

    var fDone = function() {

        document.getElementById("schedule-preview-pane").style.display = "block";
        document.getElementById("browsing-interface").style.display = "block";
        
        var pickedSections = new Exhibit.Collection("picked-sections", window.database);
        var pickedClasses = new Exhibit.Collection("picked-classes", window.database);
        pickedSections._update = function() {
            this._items = this._database.getSubjects("true", "picked");
            this._onRootItemsChanged();
        };
		pickedClasses._update = function() {
		    this._items = this._database.getSubjects("true", "sectionPicked");
		    this._onRootItemsChanged();
		};
        pickedSections._update();
        pickedClasses._update();
        
        
        window.exhibit = Exhibit.create();
        window.exhibit.setCollection("picked-sections", pickedSections);
        window.exhibit.setCollection("picked-classes", pickedClasses);
        window.exhibit.configureFromDOM();
        
        
        enableMiniTimegrid();
//        enableClassList();
        checkForCookies();
    };
    loadURLs(urls, fDone);
}

function addCourses(courseIDs, urls) { 
    var coursesA = [];
    var exceptions = { };
    for (var i = 0; i < courseIDs.length; i++) {
        if (courseIDs[i] != "hass_d") {
            if (!debug && courseIDs[i] in exceptions) {
                urls.push("data/spring-fall/exceptions/" + courseIDs[i] + ".json");
            } else {
                coursesA.push(courseIDs[i]);
            }
        }
    }
}

function loadMoreClass(button) {
    var classID = button.getAttribute("classID");
    var course = classID.split(".")[0];
    loadSingleCourse(course);
}

function loadSingleCourse(course) {
    var urls = [];
    addCourses([course], urls);

    SimileAjax.WindowManager.cancelPopups();
    loadURLs(urls, function(){});
}

function isLoaded(courseID) {
    for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
        if (courseID == course.number)
            return course.loaded ? true : false;
    }
}

function loadURLs(urls, fDone) {
    var fNext = function() {
        if (urls.length > 0) {
            var url = urls.shift();
            	loadScrapedData(url, window.database, fNext);
        } else {
            fDone();
        }
    };
    fNext();
}

function loadScrapedData(link, database, cont) {
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);

    var fError = function(statusText, status, xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) cont();
    };
    
    var fDone = function(xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        try {
            var o = null;
            try {
                o = eval("(" + xmlhttp.responseText + ")");
            } catch (e) {
                Exhibit.UI.showJsonFileValidation(Exhibit.l10n.badJsonMessage(url, e), url);
            }
            
            if (o != null) {
                database.loadData(o, Exhibit.Persistence.getBaseURL(url));
            }
        } catch (e) {
            SimileAjax.Debug.exception(e, "Error loading Exhibit JSON data from " + url);
        } finally {
            if (cont) cont();
        }
    };

    Exhibit.UI.showBusyIndicator();
    SimileAjax.XmlHttp.get(url, fError, fDone);
};

function showPrereq(elmt, itemID) {
    Exhibit.UI.showItemInPopup(itemID, elmt, exhibit.getUIContext());
}

/*==================================================
 * Panel switching and facet toggling
 *==================================================
 */


function onShowScheduleDetails() {
    SimileAjax.History.addLengthyAction(
        showScheduleDetails,
        showSchedulePreview,
        "Show Schedule Details"
    );
}

function onShowSchedulePreview() {
    SimileAjax.History.addLengthyAction(
        showSchedulePreview,
        showScheduleDetails,
        "Show Classes"
    );
}

function showScheduleDetails() {
    document.getElementById("classes-layer").style.visibility = "hidden";
    document.getElementById("schedule-preview-pane").style.visibility = "hidden";
    
    document.getElementById("schedule-details-layer").style.visibility = "visible";
    
    scroll(0, 0);
}

function showSchedulePreview() {
    document.getElementById("schedule-details-layer").style.visibility = "hidden";
    
    document.getElementById("classes-layer").style.visibility = "visible";
    document.getElementById("schedule-preview-pane").style.visibility = "visible";
    
    scroll(0, 0);
}


/*==================================================
 * Section picking
 *==================================================
 */

function onPickUnpick(button) {
    var sectionID = button.getAttribute("sectionID");
    var picked = window.database.getObject(sectionID, "picked") == "true";
    if (picked) {
        SimileAjax.History.addLengthyAction(
            function() { doUnpick(sectionID) },
            function() { doPick(sectionID) },
            "Unpicked " + sectionID
        );
    } else {
        SimileAjax.History.addLengthyAction(
            function() { doPick(sectionID) },
            function() { doUnpick(sectionID) },
            "Picked " + sectionID
        );
    }
};

function onUnpick(button) {
    var sectionID = button.getAttribute("sectionID");
    SimileAjax.History.addLengthyAction(
        function() { doUnpick(sectionID) },
        function() { doPick(sectionID) },
        "Unpicked " + sectionID
    );
};

function doPick(sectionID) {
    console.log("doPick: "+sectionID);
    window.database.addStatement(sectionID, "picked", "true");
    window.database.addStatement(sectionID, "color", getNewColor());
    window.database.removeStatement(sectionID, "temppick", "true");
    
    window.exhibit.getCollection("picked-sections")._update();

    showHidePickDiv(sectionID, true);
}
function doUnpick(sectionID) {
    console.log("doUnpick: "+sectionID);
    var color = window.database.getObject(sectionID, "color");
    releaseColor(color);
    
    window.database.removeStatement(sectionID, "picked", "true");
    window.database.removeStatement(sectionID, "color", color);
    
    window.exhibit.getCollection("picked-sections")._update();
    
    showHidePickDiv(sectionID, false);
}

function onMouseOverSection(div) {
    //if (!SimileAjax.Platform.browser.isIE) {
        var sectionID = div.getAttribute("sectionID");
        if (window.database.getObject(sectionID, "picked") == null) {
            updateMiniTimegrid(true, sectionID);
        }
    //}
}
function onMouseOutSection(div) {
    //if (!SimileAjax.Platform.browser.isIE) {
        var sectionID = div.getAttribute("sectionID");
        if (window.database.getObject(sectionID, "picked") == null) {
            updateMiniTimegrid(true, null);
        }
    //}
}
function showHidePickDiv(sectionID, picked) {
    var thediv = document.getElementById("divid-" + sectionID);
    if (thediv != null) {
        thediv.className = picked ? "each-section-picked" : "each-section-unpicked";
        
        var button = thediv.getElementsByTagName("button")[0];
        button.innerHTML = picked ? "Remove" : "Add";
    }
}

