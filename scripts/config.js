var debug = (document.location.search == "?debug");

var courses = [
    {   number: "1",
        name:   "Civil and Environmental Engineering",
        hasData: true
    },
    {   number:  "2",
        name:    "Mechanical Engineering",
        hasData: true
    },
    {   number:  "3",
        name:    "Materials Science and Engineering",
        hasData: true
    },
    {   number: "4",
        name:   "Architecture",
        hasData: true
    },
    {   number: "5",
        name:   "Chemistry",
        hasData: true
    },
    {   number: "6",
        name:   "Electrical Engineering and Computer Science",
        hasData: true
    },
    {   number: "7",
        name:   "Biology",
        hasData: true
    },
    {   number:  "8",
        name:    "Physics",
        hasData: true
    },
    {   number: "9",
        name:   "Brain and Cognitive Sciences",
        hasData: true
    },
    {   number: "10",
        name:   "Chemical Engineering",
        hasData: true
    },
    {   number:  "11",
        name:    "Urban Studies and Planning",
        hasData: true
    },
    {   number: "12",
        name:   "Earth, Atmospheric, and Planetary Sciences",
        hasData: true
    },
    {   number: "14",
        name:   "Economics",
        hasData: true
    },
    {   number: "15",
        name:   "Business (see Sloan School of Management)",
        hasData: true
    },
    {   number: "16",
        name:   "Aeronautics and Astronautics",
        hasData: true
    },
    {    number:    "17",
        name:    "Political Science",
        hasData: true
    },
    {    number:    "18",
        name:    "Mathematics",
        hasData: true
    },
    {   number: "20",
        name:   "Biological Engineering",
        hasData: true
    },
    {   number: "21A",
        name:   "Anthropology",
        hasData: true
    },
    {   number: "21F",
        name:   "Foreign Languages and Literatures",
        hasData: true
    },
    {   number: "21H",
        name:   "History",
        hasData: true
    },
    {    number:    "21L",
        name:    "Literature",
        hasData: true
    },
    {    number:    "21M",
        name:    "Music and Theater Arts",
        hasData: true
    },
    {    number:    "21W",
        name:    "Writing and Humanistic Studies",
        hasData: true
    },
    {    number:    "22",
        name:    "Nuclear Science and Engineering",
        hasData: true
    },
    {   number: "24",
        name:   "Linguistics and Philosophy",
        hasData: true
    },
    {   number: "CMS",
        name:   "Comparative Media Studies",
        hasData: true
    },
    {   number: "ESD",
        name:   "Engineering Systems Division",
        hasData: true
    },
    {   number: "HST",
        name:   "Health Sciences and Technology",
        hasData: true
    },
    {   number:  "MAS",
        name:    "Media Arts and Sciences (Media Lab)",
        hasData: true
    },
    {   number:  "STS",
        name:    "Science, Technology, and Society",
        hasData: true
    },
    {   number:  "SP",
	    name:	 "Special Programs",
	    hasData:  true
    },
    {   number:  "hass_d",
        name:    "HASS D",
        hasData: true
    }
];
    
var facetData = {
    'course-facet': {
        expression: '.course',
        facetLabel: 'course &raquo;',
        height:     '10em'
    },
    'hasfinal-facet' : {
        expression: '.has-final',
        facetLabel: 'has final &raquo;',
        height:     '4em'
    },
    'level-facet': {
        expression: '.level',
        facetLabel: 'level &raquo;',
        height:     '4em'
    },
    'units-facet': {
        expression: '.units',
        facetLabel: 'units &raquo;'
    },
    'total-units-facet': {
        expression: '.total-units',
        facetLabel: 'total units &raquo;',
        height:     '8em'
    },
    'day-facet': {
        expression: '!class!section.day',
        facetLabel: 'day of week &raquo;',
        fixedOrder: 'M; T; W; R; F'
    },
    'area-facet': {
        expression: '.area',
        facetLabel: 'area &raquo;',
        height:     '20em'
    },
    'subarea-facet': {
        expression: '.subarea',
        facetLabel: 'subarea &raquo;',
        height:     '20em'
    },
    'category-facet': {
        expression: '.category',
        facetLabel: 'category &raquo;',
        height:     '20em'
    },
    'semester-facet': {
        expression: '.semester',
        facetLabel: 'semester &raquo;',
        height:     '7em'
    },
    'offering-facet': {
        expression: '.offering',
        facetLabel: 'offering &raquo;',
        height:     '8em'
    },
    'tqe-facet': {
        expression: '.TQE',
        facetLabel: 'TQE &raquo;'
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

var sectionTypeToData = {
    "LectureSection": {
        linkage:    "lecture-section-of",
        postfix:    "(lecture)"
    },
    "RecitationSection": {
        linkage:    "rec-section-of",
        postfix:    "(rec)"
    },
    "LabSection": {
        linkage:    "lab-section-of",
        postfix:    "(lab)"
    }
}

var girData = {
	"GIR:PHY1": ["8.01", "8.011", "8.012", "8.01L"],
	"GIR:PHY2": ["8.02", "8.022"],
	"GIR:CAL1": ["18.01", "18.014", "18.01A"],
	"GIR:CAL2": ["18.02", "18.022", "18.023", "18.024", "18.02A"],
	"GIR:BIOL": ["7.012", "7.013", "7.014"],
	"GIR:CHEM": ["3.091", "5.111", "5.112"]
}

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

