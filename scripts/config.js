var debug = (document.location.search == "?debug");

var facetData = {
    'day-facet': {
        expression: '!class!section.day',
        facetLabel: 'day of week &raquo;',
        fixedOrder: 'M; T; W; R; F'
    },
    'category-facet': {
        expression: '.category',
        facetLabel: 'category &raquo;',
        height:     '20em'
    },
    'subcategory-facet': {
        expression: '.subcategory',
        facetLabel: 'subcategory &raquo;',
        height:     '20em'
    },   
    'age-facet': {
        expression: '.age',
        facetLabel: 'Age Group &raquo;',
        height:     '20em'
    },   
   'website-facet': {
        expression: '.website',
        facetLabel: 'Website &raquo;'
    }
};

var colorTable = [
    {   color:      "#F01E4F",
        used:       false
    },
    {   color:      "#41607F",
        used:       false
    },
    {   color:      "#C69EE4",
        used:       false
    },
    {   color:      "#C28F0E",
        used:       false
    },
    {   color:      "#79CE9D",
        used:       false
    },
    {   color:      "#7A652F",
        used:       false
    },
    {   color:      "#CCFF33",
        used:       false
    },
    {   color:      "#66FF00",
        used:       false
    },
    {   color:      "#3333FF",
        used:       false
    },
    {   color:      "#9900CC",
        used:       false
    },
    {   color:      "#CCCCCC",
        used:       false
    },
    {   color:      "#FF0099",
        used:       false
    },
    {   color:      "#CCFFFF",
        used:       false
    },
    {   color:      "#666699",
        used:       false
    },
    {   color:      "#FF6600",
        used:       false
    }
];
function getNewColor() {
    for (var i = 0; i < colorTable.length; i++) {
        var entry = colorTable[i];
        if (!entry.used) {
            entry.used = true;
            return entry.color;
        }
    }
    return "black";
}
function releaseColor(c) {
    for (var i = 0; i < colorTable.length; i++) {
        var entry = colorTable[i];
        if (c == entry.color) {
            entry.used = false;
        }
    }
}

/*
var sectionTypeToData = {
    "ActivitySession": {
        linkage:    "lecture-section-of",
        postfix:    "(lecture)"
    }
}
*/

/* PersistentData object: stores functionality to deal with persistent
 * data in a cleaner way.
 */
var PersistentData = {};
PersistentData.readCookie = function(name) {
    var start = document.cookie.indexOf(name + '=');
    if (start != -1) {
        start = start + name.length + 1;
        var end = document.cookie.indexOf(';', start);
        if (end == -1)
            end = document.cookie.length;
        var content = unescape(document.cookie.substring(start, end));
        if (content != 'null')
        	return content;
        return '';
    }
    return '';
}

/**
 * Returns an Exhibit.Set of the requested stored data
 */
PersistentData.stored = function(name) {
    var sections;
    
	// if Exhibit loaded MySQL data re: picked sections
	if (window.database &&
		window.database.getObjects(name, 'list').size() > 0) {
		sections = window.database.getObjects(name, 'list');
	}
	else { // no prior user data exists, check cookie
		stringArr = this.readCookie(name);
		elts = stringArr.split(',');
		sections = new Exhibit.Set(elts);
	}

	return sections;
}

