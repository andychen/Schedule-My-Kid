/**
 * @description Javascript code for loading the mini Timegrid displaying
 *   picked schedules 
 */

var miniEventSource = new Timegrid.RecurringEventSource();
var timegridEventSource = new Timegrid.RecurringEventSource();

function updateMiniTimegrid(preview, previewSectionID) {
    var collection = window.exhibit.getCollection("picked-sections");
    var dayMap = {
        'M' : 1,
        'T' : 2,
        'W' : 3,
        'R' : 4,
        'F' : 5
    };
    
    var itemSet = collection.getRestrictedItems();
    var eProtos = [];
    var addEvent = function(label, dayLetter, start, end, color) {
        var day   = dayMap[dayLetter];
        var eProto = new Timegrid.RecurringEventSource.EventPrototype(
            [ day ], 
            start, 
            end, 
            label, 
            "", 
            "", 
            "", 
            "", 
            color, 
            "white"
        );
        eProtos.push(eProto);
    };
    var parseTime = function(s) {
        return s ? Date.parseString(s, "H:mm") ||
                   Date.parseString(s, 'H:mm:ss') : null;
    };
    var addSection = function(sectionID) {
        var db = window.exhibit.getDatabase();
        var type = db.getObject(sectionID, "type");
        var label = db.getObject(sectionID, "label");
        var color = db.getObject(sectionID, "color");
        
        db.getObjects(sectionID, "timeAndPlace").visit(function(tap) {
        	if (tap.search(/arranged/) < 0) {
				var a = tap.split(" ");
				// deals with EVE classes but ignores location changes
				if (a.length > 4 && a[2] != 'MEETS' && a[2] != 'IN' && a[1] != '(ENDS') {
					if (tap.search(/\(BEGIN/) < 0 && tap.search(/\(END/) < 0) {
						var days = a[0];
						var time = a[2].replace('(', '');
						var b = time.split("-");
						for (var x = 0; x < b.length; x++) {
							if (b[x].search(/\./) > 0) { 
								var c = b[x].split('.'); 
								c[0] = parseInt(c[0]) + 12;
								b[x] = c[0] + ':' + c[1];
							} else {
								b[x] = parseInt(b[x]) + 12;
								b[x] = b[x] + ":00";
							}
						}
					} else {
						var days = a[0].substring(0, a[0].search(/\d/));
						console.log("A: "+a);
						console.log("days: "+days);
						var time = a[0].substr(a[0].search(/\d/));
						var b = time.split("-");
						for (var x = 0; x < b.length; x++) {
							if (b[x].search(/\./) > 0) { 
								var c = b[x].split('.');
								if (c[0] < 6) { 
									c[0] = parseInt(c[0]) + 12;
									b[x] = c[0] + ':' + c[1];
								} else {
									b[x] = b[x].replace('\.', ':'); 
								}
							} else {
								if (b[x] < 6) { b[x] = parseInt(b[x]) + 12; }
								b[x] = b[x] + ":00";
							}
						}
					}
					console.log("B: "+b);
					var start = parseTime(b[0]);
					var end = b.length > 1 ? parseTime(b[1]) : start.clone().add('h', 1);
					var room = a.length > 4 ? (" @ " + a[a.length - 1]) : "";
					for (var d = 0; d < days.length ; d++) {
						addEvent(label + room + " " , days.substr(d,1), start, end, color);
					}
				} else {
					var times = a[0].split(",");
					for (var t = 0; t < times.length; t++) {
						var days = times[t].substring(0, times[t].search(/\d/));
						var time = times[t].substr(times[t].search(/\d/));
						var b = time.split("-");
						for (var x = 0; x < b.length; x++) {
							if (b[x].search(/\./) > 0) { 
								var c = b[x].split('.');
								if (c[0] < 6) { 
									c[0] = parseInt(c[0]) + 12;
									b[x] = c[0] + ':' + c[1];
								} else {
									b[x] = b[x].replace('\.', ':'); 
								}
							} else {
								if (b[x] < 6) { b[x] = parseInt(b[x]) + 12; }
								b[x] = b[x] + ":00";
							}
						}
						var start = parseTime(b[0]);
						var end = b.length > 1 ? parseTime(b[1]) : start.clone().add('h', 1);
						var room = a.length > 1 ? (" @ " + a[a.length - 1]) : "";
						for (var d = 0; d < days.length ; d++) {
							addEvent(label + room + " " , days.substr(d,1), start, end, color);
						}
					}
				}
			}
        });
    };
    
    itemSet.visit(addSection);
    if (preview) {
        if (previewSectionID) {
            addSection(previewSectionID);
        }
        miniEventSource.setEventPrototypes(eProtos);
    } else {
        miniEventSource.setEventPrototypes(eProtos);
        timegridEventSource.setEventPrototypes(eProtos);
    }
};

function enableMiniTimegrid() {
    var collection = window.exhibit.getCollection("picked-sections");
    
    collection.addListener({ onItemsChanged: function() { updateMiniTimegrid(false); } });
    updateMiniTimegrid();
    
    window.timegrids = [
        Timegrid.createFromDOM($('#mini-timegrid').get(0)),
        Timegrid.createFromDOM($('#timegrid').get(0))
    ];
    
    window.onresize = function() { Timegrid.resize(); };
};

