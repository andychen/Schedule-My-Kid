/******************************************************************************
 * Timegrid
 *****************************************************************************/

console.log("== timegrid.js == ");
Timegrid.create = function(node, eventSource, layoutName, layoutParams) {
    return new Timegrid._Impl(node, eventSource, layoutName, layoutParams);
};

Timegrid.resize = function() {
    for (var i = 0; i < window.timegrids.length; i++) {
        window.timegrids[i]._resize();
    }
    return false;
};

Timegrid.createFromDOM = function(elmt) {
    var config = Timegrid.getConfigFromDOM(elmt);
    var layoutNames = config.views.split(",");
    var getExtension = function(s) {
        return s.split('.').pop().toLowerCase();
    };
    if (config.eventsource) {
        var eventSource = eval(config.eventsource);
        var tg = Timegrid.create(elmt, eventSource, layoutNames, config);
        return tg;
    } else if (config.src) {
        var eventSource = new Timegrid.DefaultEventSource();
        var tg = Timegrid.create(elmt, eventSource, layoutNames, config);
        switch (getExtension(config.src)) {
            case 'xml':
            tg.loadXML(config.src, function(xml, url) {
                eventSource.loadXML(xml, url);
            });
            break;
            case 'js':
            tg.loadJSON(config.src, function(json, url) {
                eventSource.loadJSON(json, url);
            });
            break;
        }
        return tg;
    }
};

Timegrid.getConfigFromDOM = function(elmt) {
    var config = $(elmt).attrs('tg');
    config.scrollwidth = $.scrollWidth();
    for (var k in config) {
        config[k.toLowerCase()] = config[k];
    }
    return config;
};

Timegrid.loadXML = function(url, f) {
    var fError = function(statusText, status, xmlhttp) {
        alert(Timegrid.l10n.xmlErrorMessage + " " + url + "\n" + statusText);
    };
    var fDone = function(xmlhttp) {
        var xml = xmlhttp.responseXML;
        if (!xml.documentElement && xmlhttp.responseStream) {
            xml.load(xmlhttp.responseStream);
        }
        f(xml, url);
    };
    SimileAjax.XmlHttp.get(url, fError, fDone);
};

Timegrid.loadJSON = function(url, f) {
    var fError = function(statusText, status, xmlhttp) {
        alert(Timegrid.l10n.jsonErrorMessage + " " + url + "\n" + statusText);
    };
    var fDone = function(xmlhttp) {
        f(eval('(' + xmlhttp.responseText + ')'), url);
    };
    SimileAjax.XmlHttp.get(url, fError, fDone);
};

Timegrid._Impl = function(node, eventSource, layoutNames, layoutParams) {
    var tg = this;
    this._container = node;
    this._eventSource = eventSource;
    this._layoutNames = layoutNames;
    this._layoutParams = layoutParams;

    if (this._eventSource) {
        this._eventListener = {
            onAddMany: function() { tg._onAddMany(); },
            onClear:   function() { tg._onClear(); }
        }
        this._eventSource.addListener(this._eventListener);
    }

    this._construct();
};

Timegrid._Impl.prototype.loadXML = function(url, f) {
    var tg = this;

    var fError = function(statusText, status, xmlhttp) {
        alert(Timegrid.l10n.xmlErrorMessage + " " + url + "\n" + statusText);
        tg.hideLoadingMessage();
    };
    var fDone = function(xmlhttp) {
        try {
            var xml = xmlhttp.responseXML;
            if (!xml.documentElement && xmlhttp.responseStream) {
                xml.load(xmlhttp.responseStream);
            }
            f(xml, url);
        } finally {
            tg.hideLoadingMessage();
        }
    };
    this.showLoadingMessage();
    window.setTimeout(function() {
        SimileAjax.XmlHttp.get(url, fError, fDone);
    }, 0);
};

Timegrid._Impl.prototype.loadJSON = function(url, f) {
    var tg = this;
    var fError = function(statusText, status, xmlhttp) {
        alert(Timegrid.l10n.jsonErrorMessage + " " + url + "\n" + statusText);
        tg.hideLoadingMessage();
    };
    var fDone = function(xmlhttp) {
        try {
            f(eval('(' + xmlhttp.responseText + ')'), url);
        } finally {
            tg.hideLoadingMessage();
        }
    };
    this.showLoadingMessage();
    window.setTimeout(function() { SimileAjax.XmlHttp.get(url, fError, fDone); }, 0);
};

Timegrid._Impl.prototype._construct = function() {
    this.rendering = true;
    var self = this;
    this._layouts = $.map(this._layoutNames, function(s) {
        return Timegrid.LayoutFactory.createLayout(s, self._eventSource,
                                                      self._layoutParams);
    });
    if (this._panel) {
        this._panel.setLayouts(this._layouts);
    } else {
        this._panel = new Timegrid.Controls.Panel(this._layouts);
    }
    var container = this._container;
    var doc = container.ownerDocument;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    $(container).addClass('timegrid-default');

    var message = SimileAjax.Graphics.createMessageBubble(doc);
    message.containerDiv.className = "timegrid-message-container";
    container.appendChild(message.containerDiv);

    message.contentDiv.className = "timegrid-message";
    message.contentDiv.innerHTML = "<img src='" + Timegrid.urlPrefix
        + "images/progress-running.gif' /> " + Timegrid.l10n.loadingMessage;

    this.showLoadingMessage = function() { $(message.containerDiv).show(); };
    this.hideLoadingMessage = function() { $(message.containerDiv).hide(); };

    this._panel.render(container);
    this.rendering = false;
};

Timegrid._Impl.prototype._update = function() {
    this._panel.renderChanged();
};

Timegrid._Impl.prototype._resize = function() {
    var newHeight = $(this._container).height();
    var newWidth = $(this._container).width();
    
    if (!(newHeight == this._oldHeight && newWidth == this._oldWidth)) {
        if (!this.rendering) { this._construct(); }       
        this._oldHeight = newHeight;
        this._oldWidth = newWidth;
    }
};

Timegrid._Impl.prototype._onAddMany = function() {
    this._update();
};

Timegrid._Impl.prototype._onClear = function() {
    this._update();
};

/******************************************************************************
 * Utility Functions
 *****************************************************************************/

console.log("== util.js ==");
Timegrid.abstract = function(name) {
    return function() { 
        throw "A " + name + " method has not been implemented!"; 
        return;
    };
};

SimileAjax.DateTime.Interval = function(ms) {
    // Conversion factors as varants to eliminate all the multiplication
    var SECONDS_CF     = 1000;
    var MINUTES_CF     = 60000;          
    var HOURS_CF       = 3600000;       
    var DAYS_CF        = 86400000;     
    var WEEKS_CF       = 604800000;   
    var FORTNIGHTS_CF  = 1209600000; 
    var MONTHS_CF      = 2592000000;
    var QUARTERS_CF    = 7776000000;
    var YEARS_CF       = 31557600000;
    var DECADES_CF     = 315576000000;
    var CENTURIES_CF   = 3155760000000;

    this.milliseconds = Math.abs(ms);
    this.seconds      = Math.round(this.milliseconds / SECONDS_CF); 
    this.minutes      = Math.round(this.milliseconds / MINUTES_CF);
    this.hours        = Math.round(this.milliseconds / HOURS_CF);
    this.days         = Math.floor(this.milliseconds / DAYS_CF);
    this.weeks        = Math.round(this.milliseconds / WEEKS_CF);
    this.fortnights   = Math.round(this.milliseconds / FORTNIGHTS_CF);
    this.months       = Math.round(this.milliseconds / MONTHS_CF);
    // rounding errors!
    this.quarters     = Math.round(this.milliseconds / QUARTERS_CF);
    // rounding errors!
    this.years        = Math.round(this.milliseconds / YEARS_CF); 
    // rounding errors!
    this.decades      = Math.round(this.milliseconds / DECADES_CF); 
    // rounding errors!  
    this.centuries    = Math.round(this.milliseconds / CENTURIES_CF);  
    // rounding errors!
};

SimileAjax.DateTime.Interval.prototype.toString = function() {
    return this.milliseconds.toString();
};
/*==================================================
 *  Debug Utility Functions
 *==================================================
 */
console.log("== debug.js ==");
Timegrid.Debug = new Object();

Timegrid.Debug.log = function(msg) {
};

Timegrid.Debug.exception = function(e) {
    alert("Caught exception: " + (SimileAjax.Platform.isIE ? e.message : e));
};
console.log("== date.js ==");
/**
 * Copyright (c)2005-2007 Matt Kruse (javascripttoolbox.com)
 * 
 * Dual licensed under the MIT and GPL licenses. 
 * This basically means you can use this code however you want for
 * free, but don't claim to have written it yourself!
 * Donations always accepted: http://www.JavascriptToolbox.com/donate/
 * 
 * Please do not link to the .js files on javascripttoolbox.com from
 * your site. Copy the files locally to your server instead.
 * 
 * Modified by Mason Tang, SIMILE Project, 2007
 *   - Changed behavior of format and parse for AM/PM, behavior of 'a' is now
 *     bound to 'A', while 'a' will print a lowercase 'am/pm'.
 */
/*
Date functions

These functions are used to parse, format, and manipulate Date objects.
See documentation and examples at http://www.JavascriptToolbox.com/lib/date/

*/
Date.$VERSION = 1.02;

// Utility function to append a 0 to single-digit numbers
Date.LZ = function(x) {return(x<0||x>9?"":"0")+x};

/**
 * Parse a string and convert it to a Date object.
 * If no format is passed, try a list of common formats.
 * If string cannot be parsed, return null.
 * Avoids regular expressions to be more portable.
 */
Date.parseString = function(val, format) {
    // If no format is specified, try a few common formats
    if (typeof(format)=="undefined" || format==null || format=="") {
        var generalFormats=new Array('y-M-d','MMM d, y','MMM d,y','y-MMM-d','d-MMM-y','MMM d','MMM-d','d-MMM');
        var monthFirst=new Array('M/d/y','M-d-y','M.d.y','M/d','M-d');
        var dateFirst =new Array('d/M/y','d-M-y','d.M.y','d/M','d-M');
        var checkList=new Array(generalFormats,Date.preferAmericanFormat?monthFirst:dateFirst,Date.preferAmericanFormat?dateFirst:monthFirst);
        for (var i=0; i<checkList.length; i++) {
            var l=checkList[i];
            for (var j=0; j<l.length; j++) {
                var d=Date.parseString(val,l[j]);
                if (d!=null) { 
                    return d; 
                }
            }
        }
        return null;
    };

    this.isInteger = function(val) {
        for (var i=0; i < val.length; i++) {
            if ("1234567890".indexOf(val.charAt(i))==-1) { 
                return false; 
            }
        }
        return true;
    };
    this.getInt = function(str,i,minlength,maxlength) {
        for (var x=maxlength; x>=minlength; x--) {
            var token=str.substring(i,i+x);
            if (token.length < minlength) { 
                return null; 
            }
            if (this.isInteger(token)) { 
                return token; 
            }
        }
    return null;
    };
    val=val+"";
    format=format+"";
    var i_val=0;
    var i_format=0;
    var c="";
    var token="";
    var token2="";
    var x,y;
    var year=new Date().getFullYear();
    var month=1;
    var date=1;
    var hh=0;
    var mm=0;
    var ss=0;
    var ampm="";
    while (i_format < format.length) {
        // Get next token from format string
        c=format.charAt(i_format);
        token="";
        while ((format.charAt(i_format)==c) && (i_format < format.length)) {
            token += format.charAt(i_format++);
        }
        // Extract contents of value based on format token
        if (token=="yyyy" || token=="yy" || token=="y") {
            if (token=="yyyy") { 
                x=4;y=4; 
            }
            if (token=="yy") { 
                x=2;y=2; 
            }
            if (token=="y") { 
                x=2;y=4; 
            }
            year=this.getInt(val,i_val,x,y);
            if (year==null) { 
                return null; 
            }
            i_val += year.length;
            if (year.length==2) {
                if (year > 70) { 
                    year=1900+(year-0); 
                }
                else { 
                    year=2000+(year-0); 
                }
            }
        }
        else if (token=="MMM" || token=="NNN"){
            month=0;
            var names = (token=="MMM"?(Date.l10n.monthNames.concat(Date.l10n.monthAbbreviations)):Date.l10n.monthAbbreviations);
            for (var i=0; i<names.length; i++) {
                var month_name=names[i];
                if (val.substring(i_val,i_val+month_name.length).toLowerCase()==month_name.toLowerCase()) {
                    month=(i%12)+1;
                    i_val += month_name.length;
                    break;
                }
            }
            if ((month < 1)||(month>12)){
                return null;
            }
        }
        else if (token=="EE"||token=="E"){
            var names = (token=="EE"?Date.l10n.dayNames:Date.l10n.dayAbbreviations);
            for (var i=0; i<names.length; i++) {
                var day_name=names[i];
                if (val.substring(i_val,i_val+day_name.length).toLowerCase()==day_name.toLowerCase()) {
                    i_val += day_name.length;
                    break;
                }
            }
        }
        else if (token=="MM"||token=="M") {
            month=this.getInt(val,i_val,token.length,2);
            if(month==null||(month<1)||(month>12)){
                return null;
            }
            i_val+=month.length;
        }
        else if (token=="dd"||token=="d") {
            date=this.getInt(val,i_val,token.length,2);
            if(date==null||(date<1)||(date>31)){
                return null;
            }
            i_val+=date.length;
        }
        else if (token=="hh"||token=="h") {
            hh=this.getInt(val,i_val,token.length,2);
            if(hh==null||(hh<1)||(hh>12)){
                return null;
            }
            i_val+=hh.length;
        }
        else if (token=="HH"||token=="H") {
            hh=this.getInt(val,i_val,token.length,2);
            if(hh==null||(hh<0)||(hh>23)){
                return null;
            }
            i_val+=hh.length;
        }
        else if (token=="KK"||token=="K") {
            hh=this.getInt(val,i_val,token.length,2);
            if(hh==null||(hh<0)||(hh>11)){
                return null;
            }
            i_val+=hh.length;
            hh++;
        }
        else if (token=="kk"||token=="k") {
            hh=this.getInt(val,i_val,token.length,2);
            if(hh==null||(hh<1)||(hh>24)){
                return null;
            }
            i_val+=hh.length;
            hh--;
        }
        else if (token=="mm"||token=="m") {
            mm=this.getInt(val,i_val,token.length,2);
            if(mm==null||(mm<0)||(mm>59)){
                return null;
            }
            i_val+=mm.length;
        }
        else if (token=="ss"||token=="s") {
            ss=this.getInt(val,i_val,token.length,2);
            if(ss==null||(ss<0)||(ss>59)){
                return null;
            }
            i_val+=ss.length;
        }
        else if (token=="A") {
            if (val.substring(i_val,i_val+2).toLowerCase()=="am") {
                ampm="AM";
            }
            else if (val.substring(i_val,i_val+2).toLowerCase()=="pm") {
                ampm="PM";
            }
            else {
                return null;
            }
            i_val+=2;
        }
        else {
            if (val.substring(i_val,i_val+token.length)!=token) {
                return null;
            }
            else {
                i_val+=token.length;
            }
        }
    }
    // If there are any trailing characters left in the value, it doesn't match
    if (i_val != val.length) { 
        return null; 
    }
    // Is date valid for month?
    if (month==2) {
        // Check for leap year
        if ( ( (year%4==0)&&(year%100 != 0) ) || (year%400==0) ) { // leap year
            if (date > 29){ 
                return null; 
            }
        }
        else { 
            if (date > 28) { 
                return null; 
            } 
        }
    }
    if ((month==4)||(month==6)||(month==9)||(month==11)) {
        if (date > 30) { 
            return null; 
        }
    }
    // Correct hours value
    if (hh<12 && ampm=="PM") {
        hh=hh-0+12; 
    }
    else if (hh>11 && ampm=="AM") { 
        hh-=12; 
    }
    return new Date(year,month-1,date,hh,mm,ss);
};

(function() {
	/**
	 * Adds a given method under the given name 
	 * to the Date prototype if it doesn't
	 * currently exist.
	 *
	 * @private
	 */
	function add(name, method) {
		if( !Date.prototype[name] ) {
			Date.prototype[name] = method;
		}
	};
    
    add('getFullYear', function() { 
        var yy=this.getYear(); 
        return (yy<1900?yy+1900:yy);
    });
    
    /**
     * Check if a date string is valid
     */
    add('isValid', function(val, format) {
        return (Date.parseString(val,format) != null);
    });
    
    /**
     * Check if a date object is before another date object
     */
    add('isBefore', function(date2) {
    	if (date2==null) { 
    		return false; 
    	}
    	return (this.getTime()<date2.getTime());
    });
    
    /**
     * Check if a date object is after another date object
     */
    add('isAfter', function(date2) {
    	if (date2==null) { 
    		return false; 
    	}
    	return (this.getTime()>date2.getTime());
    });
    
    /**
     * Check if a date object is between two dates
     */
    add('isBetween', function(date1, date2) {
        return this.isAfter(date1) && this.isBefore(date2);
    });
    
    /**
     * Check if two date objects have equal dates and times
     */
    add('equals', function(date2) {
    	if (date2==null) { 
    		return false; 
    	}
    	return (this.getTime()==date2.getTime());
    });
    
    /**
     * Check if two date objects have equal dates, disregarding times
     */
    add('equalsIgnoreTime', function(date2) {
    	if (date2==null) { 
    		return false; 
    	}
    	var d1 = new Date(this.getTime()).clearTime();
    	var d2 = new Date(date2.getTime()).clearTime();
    	return (d1.getTime()==d2.getTime());
    });
    
    /**
     * Format a date into a string using a given format string
     */
     add('format', function(format) {
    	format=format+"";
    	var result="";
    	var i_format=0;
    	var c="";
    	var token="";
    	var y=this.getYear()+"";
    	var M=this.getMonth()+1;
    	var d=this.getDate();
    	var E=this.getDay();
    	var H=this.getHours();
    	var m=this.getMinutes();
    	var s=this.getSeconds();
        var w=this.getWeekOfYear();
    	var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,H,KK,K,kk,k;
    	// Convert real date parts into formatted versions
    	var value=new Object();
    	if (y.length < 4) {
    		y=""+(+y+1900);
    	}
    	value["y"]=""+y;
    	value["yyyy"]=y;
    	value["yy"]=y.substring(2,4);
    	value["M"]=M;
    	value["MM"]=Date.LZ(M);
    	value["MMM"]=Date.l10n.monthNames[M-1];
    	value["NNN"]=Date.l10n.monthAbbreviations[M-1];
    	value["d"]=d;
    	value["dd"]=Date.LZ(d);
    	value["E"]=Date.l10n.dayAbbreviations[E];
    	value["EE"]=Date.l10n.dayNames[E];
        value["e"]=value["E"].substr(0,1);
    	value["H"]=H;
    	value["HH"]=Date.LZ(H);
    	if (H==0){
    		value["h"]=12;
    	}
    	else if (H>12){
    		value["h"]=H-12;
    	}
    	else {
    		value["h"]=H;
    	}
    	value["hh"]=Date.LZ(value["h"]);
    	value["K"]=value["h"]-1;
    	value["k"]=value["H"]+1;
    	value["KK"]=Date.LZ(value["K"]);
    	value["kk"]=Date.LZ(value["k"]);
    	if (H > 11) { 
    		value["A"]="PM"; 
            value["a"]="pm";
    	}
    	else { 
    		value["A"]="AM"; 
            value["a"]="am";
    	}
    	value["m"]=m;
    	value["mm"]=Date.LZ(m);
    	value["s"]=s;
    	value["ss"]=Date.LZ(s);
        value["w"]=w;
    	while (i_format < format.length) {
    		c=format.charAt(i_format);
    		token="";
    		while ((format.charAt(i_format)==c) && (i_format < format.length)) {
    			token += format.charAt(i_format++);
    		}
    		if (typeof(value[token])!="undefined") { 
    			result=result + value[token]; 
    		}
    		else { 
    			result=result + token; 
    		}
    	}
    	return result;
    });
    
    /**
     * Get the full name of the day for a date
     */
    add('getDayName', function() { 
        return Date.l10n.dayNames[this.getDay()];
    });
    
    /**
     * Get the abbreviation of the day for a date
     */
    add('getDayAbbreviation', function() { 
        return Date.l10n.dayAbbreviations[this.getDay()];
    });
    
    /**
     * Get the full name of the month for a date
     */
    add('getMonthName', function() {
        return Date.l10n.monthNames[this.getMonth()];
    });
    
    /**
     * Get the abbreviation of the month for a date
     */
    add('getMonthAbbreviation',  function() { 
        return Date.l10n.monthAbbreviations[this.getMonth()];
    });
    
	/**
	 * Get the number of the week of the year.
	 * 
	 * @example var dtm = new Date("01/12/2008");
	 * dtm.getWeekOfYear();
	 * @result 2
	 * 
	 * @name getWeekOfYear
	 * @type Number
	 * @cat Plugins/Methods/Date
	 */
	add("getWeekOfYear", function() {
        dowOffset = Date.l10n.firstDayOfWeek;
        var newYear = new Date(this.getFullYear(),0,1);
        var day = newYear.getDay() - dowOffset; //the day of week the year begins on
        day = (day >= 0 ? day : day + 7);
        var daynum = Math.floor((this.getTime() - newYear.getTime() -
        (this.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
        var weeknum;
        //if the year starts before the middle of a week
        if(day < 4) {
            weeknum = Math.floor((daynum+day-1)/7) + 1;
            if(weeknum > 52) {
                nYear = new Date(this.getFullYear() + 1,0,1);
                nday = nYear.getDay() - dowOffset;
                nday = nday >= 0 ? nday : nday + 7;
                /*if the next year starts before the middle of
                the week, it is week #1 of that year*/
                weeknum = nday < 4 ? 1 : 53;
            }
        } else {
            weeknum = Math.floor((daynum+day-1)/7);
        }
        return weeknum;
	});
    
    /**
     * Given a timezone offset in hours, returns a new Date object that has
     * been adjusted to that timezone.
     *
     * @function
     * @memberOf Date
     * @param {Number} timezoneOffset the timezone offset in hours
     * @return {Date} a new Date object
     */
    add('toTimezone', function(timezoneOffset) {
        var minutesToMs = 60000; var hoursToMs = 60 * minutesToMs;
        var utcMs    = this.getTime() + (this.getTimezoneOffset() * minutesToMs);
        var offsetMs = hoursToMs * timezoneOffset;
        return new Date(utcMs + offsetMs);
    });
    
    /**
     * Clear all time information in a date object
     */
    add('clearTime', function() {
        this.setHours(0); 
        this.setMinutes(0);
        this.setSeconds(0); 
        this.setMilliseconds(0);
        return this;
    });
    
    /**
     * Clones this date into a new object, optionally modifying the provided
     * instance instead.
     */
    add('clone', function(date) {
        if (date && date instanceof Date) {
            date.setTime(this.getTime());
            return date;
        } else {
            return new Date(this);
        }
    });

    /**
     * Set the day of the week of the date within this same week
     */
    add('setDay', function(n) {
        var day = this.getDay();
        if (day == n) { return this; }
        if (n == 7) { this.add('d', 7); return this.setDay(0); }
        if (day < n) { this.add('d', 1); return this.setDay(n); }
        if (day > n) { this.add('d', -1); return this.setDay(n); }
    });
    
    /**
     * Add an amount of time to a date. Negative numbers can be passed to 
     * subtract time.
     */
    add('add', function(interval, number) {
    	if (typeof(interval)=="undefined" || interval==null || typeof(number)=="undefined" || number==null) { 
    		return this; 
    	}
    	number = +number;
    	if (interval=='y') { // year
    		this.setFullYear(this.getFullYear()+number);
    	}
    	else if (interval=='M') { // Month
    		this.setMonth(this.getMonth()+number);
    	}
    	else if (interval=='d') { // Day
    		this.setDate(this.getDate()+number);
    	}
    	else if (interval=='w') { // Weekday
    		var step = (number>0)?1:-1;
    		while (number!=0) {
    			this.add('d',step);
    			while(this.getDay()==0 || this.getDay()==6) { 
    				this.add('d',step);
    			}
    			number -= step;
    		}
    	}
    	else if (interval=='h') { // Hour
    		this.setHours(this.getHours() + number);
    	}
    	else if (interval=='m') { // Minute
    		this.setMinutes(this.getMinutes() + number);
    	}
    	else if (interval=='s') { // Second
    		this.setSeconds(this.getSeconds() + number);
    	}
    	return this;
    });
    
})();
if(!window.CanvasRenderingContext2D){(function(){var I=Math,i=I.round,L=I.sin,M=I.cos,m=10,A=m/2,Q={init:function(a){var b=a||document;if(/MSIE/.test(navigator.userAgent)&&!window.opera){var c=this;b.attachEvent("onreadystatechange",function(){c.r(b)})}},r:function(a){if(a.readyState=="complete"){if(!a.namespaces["s"]){a.namespaces.add("g_vml_","urn:schemas-microsoft-com:vml")}var b=a.createStyleSheet();b.cssText="canvas{display:inline-block;overflow:hidden;text-align:left;width:300px;height:150px}g_vml_\\:*{behavior:url(#default#VML)}";
var c=a.getElementsByTagName("canvas");for(var d=0;d<c.length;d++){if(!c[d].getContext){this.initElement(c[d])}}}},q:function(a){var b=a.outerHTML,c=a.ownerDocument.createElement(b);if(b.slice(-2)!="/>"){var d="/"+a.tagName,e;while((e=a.nextSibling)&&e.tagName!=d){e.removeNode()}if(e){e.removeNode()}}a.parentNode.replaceChild(c,a);return c},initElement:function(a){a=this.q(a);a.getContext=function(){if(this.l){return this.l}return this.l=new K(this)};a.attachEvent("onpropertychange",V);a.attachEvent("onresize",
W);var b=a.attributes;if(b.width&&b.width.specified){a.style.width=b.width.nodeValue+"px"}else{a.width=a.clientWidth}if(b.height&&b.height.specified){a.style.height=b.height.nodeValue+"px"}else{a.height=a.clientHeight}return a}};function V(a){var b=a.srcElement;switch(a.propertyName){case "width":b.style.width=b.attributes.width.nodeValue+"px";b.getContext().clearRect();break;case "height":b.style.height=b.attributes.height.nodeValue+"px";b.getContext().clearRect();break}}function W(a){var b=a.srcElement;
if(b.firstChild){b.firstChild.style.width=b.clientWidth+"px";b.firstChild.style.height=b.clientHeight+"px"}}Q.init();var R=[];for(var E=0;E<16;E++){for(var F=0;F<16;F++){R[E*16+F]=E.toString(16)+F.toString(16)}}function J(){return[[1,0,0],[0,1,0],[0,0,1]]}function G(a,b){var c=J();for(var d=0;d<3;d++){for(var e=0;e<3;e++){var g=0;for(var h=0;h<3;h++){g+=a[d][h]*b[h][e]}c[d][e]=g}}return c}function N(a,b){b.fillStyle=a.fillStyle;b.lineCap=a.lineCap;b.lineJoin=a.lineJoin;b.lineWidth=a.lineWidth;b.miterLimit=
a.miterLimit;b.shadowBlur=a.shadowBlur;b.shadowColor=a.shadowColor;b.shadowOffsetX=a.shadowOffsetX;b.shadowOffsetY=a.shadowOffsetY;b.strokeStyle=a.strokeStyle;b.d=a.d;b.e=a.e}function O(a){var b,c=1;a=String(a);if(a.substring(0,3)=="rgb"){var d=a.indexOf("(",3),e=a.indexOf(")",d+1),g=a.substring(d+1,e).split(",");b="#";for(var h=0;h<3;h++){b+=R[Number(g[h])]}if(g.length==4&&a.substr(3,1)=="a"){c=g[3]}}else{b=a}return[b,c]}function S(a){switch(a){case "butt":return"flat";case "round":return"round";
case "square":default:return"square"}}function K(a){this.a=J();this.m=[];this.k=[];this.c=[];this.strokeStyle="#000";this.fillStyle="#000";this.lineWidth=1;this.lineJoin="miter";this.lineCap="butt";this.miterLimit=m*1;this.globalAlpha=1;this.canvas=a;var b=a.ownerDocument.createElement("div");b.style.width=a.clientWidth+"px";b.style.height=a.clientHeight+"px";b.style.overflow="hidden";b.style.position="absolute";a.appendChild(b);this.j=b;this.d=1;this.e=1}var j=K.prototype;j.clearRect=function(){this.j.innerHTML=
"";this.c=[]};j.beginPath=function(){this.c=[]};j.moveTo=function(a,b){this.c.push({type:"moveTo",x:a,y:b});this.f=a;this.g=b};j.lineTo=function(a,b){this.c.push({type:"lineTo",x:a,y:b});this.f=a;this.g=b};j.bezierCurveTo=function(a,b,c,d,e,g){this.c.push({type:"bezierCurveTo",cp1x:a,cp1y:b,cp2x:c,cp2y:d,x:e,y:g});this.f=e;this.g=g};j.quadraticCurveTo=function(a,b,c,d){var e=this.f+0.6666666666666666*(a-this.f),g=this.g+0.6666666666666666*(b-this.g),h=e+(c-this.f)/3,l=g+(d-this.g)/3;this.bezierCurveTo(e,
g,h,l,c,d)};j.arc=function(a,b,c,d,e,g){c*=m;var h=g?"at":"wa",l=a+M(d)*c-A,n=b+L(d)*c-A,o=a+M(e)*c-A,f=b+L(e)*c-A;if(l==o&&!g){l+=0.125}this.c.push({type:h,x:a,y:b,radius:c,xStart:l,yStart:n,xEnd:o,yEnd:f})};j.rect=function(a,b,c,d){this.moveTo(a,b);this.lineTo(a+c,b);this.lineTo(a+c,b+d);this.lineTo(a,b+d);this.closePath()};j.strokeRect=function(a,b,c,d){this.beginPath();this.moveTo(a,b);this.lineTo(a+c,b);this.lineTo(a+c,b+d);this.lineTo(a,b+d);this.closePath();this.stroke()};j.fillRect=function(a,
b,c,d){this.beginPath();this.moveTo(a,b);this.lineTo(a+c,b);this.lineTo(a+c,b+d);this.lineTo(a,b+d);this.closePath();this.fill()};j.createLinearGradient=function(a,b,c,d){var e=new H("gradient");return e};j.createRadialGradient=function(a,b,c,d,e,g){var h=new H("gradientradial");h.n=c;h.o=g;h.i.x=a;h.i.y=b;return h};j.drawImage=function(a,b){var c,d,e,g,h,l,n,o,f=a.runtimeStyle.width,k=a.runtimeStyle.height;a.runtimeStyle.width="auto";a.runtimeStyle.height="auto";var q=a.width,r=a.height;a.runtimeStyle.width=
f;a.runtimeStyle.height=k;if(arguments.length==3){c=arguments[1];d=arguments[2];h=(l=0);n=(e=q);o=(g=r)}else if(arguments.length==5){c=arguments[1];d=arguments[2];e=arguments[3];g=arguments[4];h=(l=0);n=q;o=r}else if(arguments.length==9){h=arguments[1];l=arguments[2];n=arguments[3];o=arguments[4];c=arguments[5];d=arguments[6];e=arguments[7];g=arguments[8]}else{throw"Invalid number of arguments";}var s=this.b(c,d),t=[],v=10,w=10;t.push(" <g_vml_:group",' coordsize="',m*v,",",m*w,'"',' coordorigin="0,0"',
' style="width:',v,";height:",w,";position:absolute;");if(this.a[0][0]!=1||this.a[0][1]){var x=[];x.push("M11='",this.a[0][0],"',","M12='",this.a[1][0],"',","M21='",this.a[0][1],"',","M22='",this.a[1][1],"',","Dx='",i(s.x/m),"',","Dy='",i(s.y/m),"'");var p=s,y=this.b(c+e,d),z=this.b(c,d+g),B=this.b(c+e,d+g);p.x=Math.max(p.x,y.x,z.x,B.x);p.y=Math.max(p.y,y.y,z.y,B.y);t.push("padding:0 ",i(p.x/m),"px ",i(p.y/m),"px 0;filter:progid:DXImageTransform.Microsoft.Matrix(",x.join(""),", sizingmethod='clip');")}else{t.push("top:",
i(s.y/m),"px;left:",i(s.x/m),"px;")}t.push(' ">','<g_vml_:image src="',a.src,'"',' style="width:',m*e,";"," height:",m*g,';"',' cropleft="',h/q,'"',' croptop="',l/r,'"',' cropright="',(q-h-n)/q,'"',' cropbottom="',(r-l-o)/r,'"'," />","</g_vml_:group>");this.j.insertAdjacentHTML("BeforeEnd",t.join(""))};j.stroke=function(a){var b=[],c=O(a?this.fillStyle:this.strokeStyle),d=c[0],e=c[1]*this.globalAlpha,g=10,h=10;b.push("<g_vml_:shape",' fillcolor="',d,'"',' filled="',Boolean(a),'"',' style="position:absolute;width:',
g,";height:",h,';"',' coordorigin="0 0" coordsize="',m*g," ",m*h,'"',' stroked="',!a,'"',' strokeweight="',this.lineWidth,'"',' strokecolor="',d,'"',' path="');var l={x:null,y:null},n={x:null,y:null};for(var o=0;o<this.c.length;o++){var f=this.c[o];if(f.type=="moveTo"){b.push(" m ");var k=this.b(f.x,f.y);b.push(i(k.x),",",i(k.y))}else if(f.type=="lineTo"){b.push(" l ");var k=this.b(f.x,f.y);b.push(i(k.x),",",i(k.y))}else if(f.type=="close"){b.push(" x ")}else if(f.type=="bezierCurveTo"){b.push(" c ");
var k=this.b(f.x,f.y),q=this.b(f.cp1x,f.cp1y),r=this.b(f.cp2x,f.cp2y);b.push(i(q.x),",",i(q.y),",",i(r.x),",",i(r.y),",",i(k.x),",",i(k.y))}else if(f.type=="at"||f.type=="wa"){b.push(" ",f.type," ");var k=this.b(f.x,f.y),s=this.b(f.xStart,f.yStart),t=this.b(f.xEnd,f.yEnd);b.push(i(k.x-this.d*f.radius),",",i(k.y-this.e*f.radius)," ",i(k.x+this.d*f.radius),",",i(k.y+this.e*f.radius)," ",i(s.x),",",i(s.y)," ",i(t.x),",",i(t.y))}if(k){if(l.x==null||k.x<l.x){l.x=k.x}if(n.x==null||k.x>n.x){n.x=k.x}if(l.y==
null||k.y<l.y){l.y=k.y}if(n.y==null||k.y>n.y){n.y=k.y}}}b.push(' ">');if(typeof this.fillStyle=="object"){var v={x:"50%",y:"50%"},w=n.x-l.x,x=n.y-l.y,p=w>x?w:x;v.x=i(this.fillStyle.i.x/w*100+50)+"%";v.y=i(this.fillStyle.i.y/x*100+50)+"%";var y=[];if(this.fillStyle.p=="gradientradial"){var z=this.fillStyle.n/p*100,B=this.fillStyle.o/p*100-z}else{var z=0,B=100}var C={offset:null,color:null},D={offset:null,color:null};this.fillStyle.h.sort(function(T,U){return T.offset-U.offset});for(var o=0;o<this.fillStyle.h.length;o++){var u=
this.fillStyle.h[o];y.push(u.offset*B+z,"% ",u.color,",");if(u.offset>C.offset||C.offset==null){C.offset=u.offset;C.color=u.color}if(u.offset<D.offset||D.offset==null){D.offset=u.offset;D.color=u.color}}y.pop();b.push("<g_vml_:fill",' color="',D.color,'"',' color2="',C.color,'"',' type="',this.fillStyle.p,'"',' focusposition="',v.x,", ",v.y,'"',' colors="',y.join(""),'"',' opacity="',e,'" />')}else if(a){b.push('<g_vml_:fill color="',d,'" opacity="',e,'" />')}else{b.push("<g_vml_:stroke",' opacity="',
e,'"',' joinstyle="',this.lineJoin,'"',' miterlimit="',this.miterLimit,'"',' endcap="',S(this.lineCap),'"',' weight="',this.lineWidth,'px"',' color="',d,'" />')}b.push("</g_vml_:shape>");this.j.insertAdjacentHTML("beforeEnd",b.join(""));this.c=[]};j.fill=function(){this.stroke(true)};j.closePath=function(){this.c.push({type:"close"})};j.b=function(a,b){return{x:m*(a*this.a[0][0]+b*this.a[1][0]+this.a[2][0])-A,y:m*(a*this.a[0][1]+b*this.a[1][1]+this.a[2][1])-A}};j.save=function(){var a={};N(this,a);
this.k.push(a);this.m.push(this.a);this.a=G(J(),this.a)};j.restore=function(){N(this.k.pop(),this);this.a=this.m.pop()};j.translate=function(a,b){var c=[[1,0,0],[0,1,0],[a,b,1]];this.a=G(c,this.a)};j.rotate=function(a){var b=M(a),c=L(a),d=[[b,c,0],[-c,b,0],[0,0,1]];this.a=G(d,this.a)};j.scale=function(a,b){this.d*=a;this.e*=b;var c=[[a,0,0],[0,b,0],[0,0,1]];this.a=G(c,this.a)};j.clip=function(){};j.arcTo=function(){};j.createPattern=function(){return new P};function H(a){this.p=a;this.n=0;this.o=
0;this.h=[];this.i={x:0,y:0}}H.prototype.addColorStop=function(a,b){b=O(b);this.h.push({offset:1-a,color:b})};function P(){}G_vmlCanvasManager=Q;CanvasRenderingContext2D=K;CanvasGradient=H;CanvasPattern=P})()};
console.log("== jquery.dimensions.js ==");
/* Copyright (c) 2007 Paul Bakaus (paul.bakaus@googlemail.com) and Brandon Aaron (brandon.aaron@gmail.com || http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * $LastChangedDate: 2007-07-01 20:19:35 -0500 (Sun, 01 Jul 2007) $
 * $Rev: 2209 $
 *
 * Version: 1.0rc1
 */
eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('(8($){p g=$.19.D,w=$.19.w;$.19.z({D:8(){4(1[0]==h)5 Z.1a||$.I&&7.10.1z||7.q.1z;4(1[0]==7)5 1t.1s(7.q.1H,7.q.13);5 g.1k(1,1h)},w:8(){4(1[0]==h)5 Z.1d||$.I&&7.10.1c||7.q.1c;4(1[0]==7)5 1t.1s(7.q.1B,7.q.11);5 w.1k(1,1h)},1a:8(){5 1[0]==h||1[0]==7?1.D():1.P(\':J\')?1[0].13-f(1,\'k\')-f(1,\'1A\'):1.D()+f(1,\'18\')+f(1,\'1y\')},1d:8(){5 1[0]==h||1[0]==7?1.w():1.P(\':J\')?1[0].11-f(1,\'j\')-f(1,\'1x\'):1.w()+f(1,\'15\')+f(1,\'1u\')},1K:8(){5 1[0]==h||1[0]==7?1.D():1.P(\':J\')?1[0].13:1.D()+f(1,\'k\')+f(1,\'1A\')+f(1,\'18\')+f(1,\'1y\')},1J:8(){5 1[0]==h||1[0]==7?1.w():1.P(\':J\')?1[0].11:1.w()+f(1,\'j\')+f(1,\'1x\')+f(1,\'15\')+f(1,\'1u\')},l:8(a){4(a!=1q)5 1.1o(8(){4(1==h||1==7)h.1m(a,$(h).n());o 1.l=a});4(1[0]==h||1[0]==7)5 Z.1G||$.I&&7.10.l||7.q.l;5 1[0].l},n:8(a){4(a!=1q)5 1.1o(8(){4(1==h||1==7)h.1m($(h).l(),a);o 1.n=a});4(1[0]==h||1[0]==7)5 Z.1F||$.I&&7.10.n||7.q.n;5 1[0].n},C:8(c,d){p a=1[0],3=a.S,6=a.R,c=$.z({Q:m,K:m,O:m,t:m},c||{}),x=a.N,y=a.M,v=a.l,u=a.n;4($.i.17||$.i.16){x+=f(a,\'j\');y+=f(a,\'k\')}4(($.i.Y||$.i.X)&&$.r(6,\'C\')!=\'W\'){x-=f(6,\'j\');y-=f(6,\'k\')}4($.i.17){B{4(3!=a&&$.r(3,\'1w\')!=\'J\'){x+=f(3,\'j\');y+=f(3,\'k\')}4(3==6)1v}H((3=3.S)&&3.s!=\'G\')}4($.i.16&&(6.s!=\'G\'&&$.r(6,\'C\')==\'W\')){B{x+=6.N;y+=6.M;x+=f(6,\'j\');y+=f(6,\'k\')}H((6=6.R)&&(6.s!=\'G\'&&$.r(6,\'C\')==\'W\'))}p b=e(a,c,x,y,v,u);4(d){$.z(d,b);5 1}o{5 b}},1I:8(b,c){p x=0,y=0,v=0,u=0,9=1[0],3=1[0],6,U,L=$.r(9,\'C\'),A=$.i.17,E=$.i.16,1p=$.i.Y,1n=$.i.X,12=m,14=m,b=$.z({Q:F,K:m,O:m,t:F,1j:m},b||{});4(b.1j)5 1.1i(b,c);4(9.s==\'G\'){x=9.N;y=9.M;4(A){x+=f(9,\'V\')+(f(9,\'j\')*2);y+=f(9,\'T\')+(f(9,\'k\')*2)}o 4(1n){x+=f(9,\'V\');y+=f(9,\'T\')}o 4(E&&1l.I){x+=f(9,\'j\');y+=f(9,\'k\')}}o{B{U=$.r(3,\'C\');x+=3.N;y+=3.M;4(A||E){x+=f(3,\'j\');y+=f(3,\'k\');4(A&&U==\'1g\')12=F;4(E&&U==\'1E\')14=F}6=3.R;4(b.t||A){B{4(b.t){v+=3.l;u+=3.n}4(A&&3!=9&&$.r(3,\'1w\')!=\'J\'){x+=f(3,\'j\');y+=f(3,\'k\')}3=3.S}H(3!=6)}3=6;4(3.s==\'G\'||3.s==\'1e\'){4((1p||(E&&$.I))&&L!=\'1g\'&&L!=\'1f\'){x+=f(3,\'V\');y+=f(3,\'T\')}4((A&&!12&&L!=\'1f\')||(E&&L==\'W\'&&!14)){x+=f(3,\'j\');y+=f(3,\'k\')}1v}}H(3)}p a=e(9,b,x,y,v,u);4(c){$.z(c,a);5 1}o{5 a}},1i:8(b,c){p x=0,y=0,v=0,u=0,3=1[0],6,b=$.z({Q:F,K:m,O:m,t:F},b||{});B{x+=3.N;y+=3.M;6=3.R;4(b.t){B{v+=3.l;u+=3.n;3=3.S}H(3!=6)}3=6}H(3&&3.s!=\'G\'&&3.s!=\'1e\');p a=e(1[0],b,x,y,v,u);4(c){$.z(c,a);5 1}o{5 a}}});p f=8(b,a){5 1D($.r(b.1C?b[0]:b,a))||0};p e=8(b,c,x,y,a,d){4(!c.Q){x-=f(b,\'V\');y-=f(b,\'T\')}4(c.K&&($.i.Y||$.i.X)){x+=f(b,\'j\');y+=f(b,\'k\')}o 4(!c.K&&!($.i.Y||$.i.X)){x-=f(b,\'j\');y-=f(b,\'k\')}4(c.O){x+=f(b,\'15\');y+=f(b,\'18\')}4(c.t){a-=b.l;d-=b.n}5 c.t?{1b:y-d,1r:x-a,n:d,l:a}:{1b:y,1r:x}}})(1l);',62,109,'|this||parent|if|return|op|document|function|elem||||||||window|browser|borderLeftWidth|borderTopWidth|scrollLeft|false|scrollTop|else|var|body|css|tagName|scroll|st|sl|width|||extend|mo|do|position|height|ie|true|BODY|while|boxModel|visible|border|elemPos|offsetTop|offsetLeft|padding|is|margin|offsetParent|parentNode|marginTop|parPos|marginLeft|static|opera|safari|self|documentElement|offsetWidth|absparent|offsetHeight|relparent|paddingLeft|msie|mozilla|paddingTop|fn|innerHeight|top|clientWidth|innerWidth|HTML|fixed|absolute|arguments|offsetLite|lite|apply|jQuery|scrollTo|oa|each|sf|undefined|left|max|Math|paddingRight|break|overflow|borderRightWidth|paddingBottom|clientHeight|borderBottomWidth|scrollWidth|jquery|parseInt|relative|pageYOffset|pageXOffset|scrollHeight|offset|outerWidth|outerHeight'.split('|'),0,{}))
console.log("== jquery.simile.js ==");
/**
 * This code implements the Simile jQuery plugin, which in turns simply
 * provides several convenient and useful functions for manipulating the
 * DOM, etc.
 * @overview Simile jQuery plugin
 */
 
jQuery.extend({
    /**
     * Simply capitalizes the first letter of each word in its argument.
     */
    capitalize: function(s) {
        return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
    },
    /**
     * Provides a basic mechanism for Javascript inheritance.
     */
    inherit: function(subclass, superclass) {
        function Dummy() {};
        Dummy.prototype = superclass.prototype;
        subclass.prototype = new Dummy();
        subclass.prototype.constructor = subclass;
        subclass.superclass = superclass;
        subclass.superproto = superclass.prototype;
    },
    /**
     * Recursively deep-copies the given object.
     */
    clone: function(obj, deep) {
        if (deep == null) { deep = true; }
        var objectClone = new obj.constructor();
        for (var property in obj) {
            if (!deep) {
                objectClone[property] = obj[property];
            } else if (typeof obj[property] == 'object') {
                objectClone[property] = obj[property].clone(deep);
            } else {
                objectClone[property] = obj[property];
            }
        }
        return objectClone;
    },
    /**
     * Returns the width of the scrollbar.
     */
    scrollWidth: function() {
        var scr = null;
        var inn = null;
        var wNoScroll = 0;
        var wScroll = 0;

        // Outer scrolling div
        scr = document.createElement('div');
        scr.style.position = 'absolute';
        scr.style.top = '-1000px';
        scr.style.left = '-1000px';
        scr.style.width = '100px';
        scr.style.height = '50px';
        // Start with no scrollbar
        scr.style.overflow = 'hidden';

        // Inner content div
        inn = document.createElement('div');
        inn.style.width = '100%';
        inn.style.height = '200px';

        // Put the inner div in the scrolling div
        scr.appendChild(inn);
        // Append the scrolling div to the doc
        document.body.appendChild(scr);

        // Width of the inner div sans scrollbar
        wNoScroll = inn.offsetWidth;
        // Add the scrollbar
        scr.style.overflow = 'auto';
        // Width of the inner div width scrollbar
        wScroll = inn.offsetWidth;

        // Remove the scrolling div from the doc
        document.body.removeChild(
            document.body.lastChild);

        // Pixel width of the scroller, with an awful, awful hack
        // FIXME: Fix hardcoded scrollwidth
        return (wNoScroll - wScroll) || 17;
    }
});

jQuery.fn.extend({
    /**
     * The attrs method extends jQuery to allow for aggregating attributes of 
     * all matched elements in a $('..') expression into a nice hash.  It also
     * supports only returning attributes within a certain namespace, e.g. 
     * ex:role, when provided with the namespace prefix as an argument.
     */
    attrs: function(ns) {
        // Caching the compiled regex speeds this up a bit
        if (!this.__namespaceRegexps) {
            this.__namespaceRegexps = {};
        }
        var regexp = this.__namespaceRegexps[ns];
        if (!regexp) {
            this.__namespaceRegexps[ns] = regexp = 
            ns ? eval("/^" + ns + ":(.+)/") : /^([^:]*)$/;
        }
        var result = {};
        this.each(function() {
            // Within this loop, 'this' refers to each matched DOM element
            var atts = this.attributes;
            var l = atts.length;
            for (var i = 0; i < l; i++) {
                var m = atts[i].name.match(regexp);
                if (m) { result[m[1]] = atts[i].value; }
            }
        });
        return result;
    }
});
console.log("== jquery.corner.js ==");
	// jquery-roundcorners-canvas
	// www.meerbox.nl
	
(function($){
	
	var _corner = function(options) {
		
		// no native canvas support, or its msie and excanvas.js not loaded
		var testcanvas = document.createElement("canvas");
		if (typeof G_vmlCanvasManager == 'undefined' && $.browser.msie) {
			return this.each(function() {});
		}
		
		// get lowest number from array
		var asNum = function(a, b) { return a-b; };
		var getMin = function(a) {
			var b = a.concat();
			return b.sort(asNum)[0];
		};
		
		// get CSS value as integer
		var getCSSint = function(el, prop) {
			return parseInt($.css(el.jquery?el[0]:el,prop))||0;
		};
			
		// draw the round corner in Canvas object
		var drawRoundCornerCanvasShape = function(canvas,radius,r_type,bg_color,border_width,border_color) {
			
			// change rgba(1,2,3,0.9) to rgb(1,2,3)
			var reg = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;   
			var bits = reg.exec(bg_color);
			if (bits) {
				channels = new Array(parseInt(bits[1]),parseInt(bits[2]),parseInt(bits[3]));
				bg_color = 'rgb('+channels[0]+', '+channels[1]+', '+channels[2]+')';
			} 
		
			var border_width = parseInt(border_width);
			
			var ctx = canvas.getContext('2d');
			
			if (radius == 1) {
				ctx.fillStyle = bg_color;
				ctx.fillRect(0,0,1,1);
				return;
			}
	
			if (r_type == 'tl') {
				var steps = new Array(0,0,radius,0,radius,0,0,radius,0,0);
			} else if (r_type == 'tr') {
				var steps = new Array(radius,0,radius,radius,radius,0,0,0,0,0);
			} else if (r_type == 'bl') {
				var steps = new Array(0,radius,radius,radius,0,radius,0,0,0,radius);
			} else if (r_type == 'br') {
				var steps = new Array(radius,radius,radius,0,radius,0,0,radius,radius,radius);
			}
	          
			ctx.fillStyle = bg_color;
	    	ctx.beginPath();
	     	ctx.moveTo(steps[0],steps[1]); 
	     	ctx.lineTo(steps[2], steps[3]); 
	    	if(r_type == 'br') ctx.bezierCurveTo(steps[4], steps[5], radius, radius, steps[6], steps[7]); 
	    	else ctx.bezierCurveTo(steps[4], steps[5], 0, 0, steps[6], steps[7]);
			ctx.lineTo(steps[8], steps[9]); 
	        ctx.fill(); 
	        
	        // draw border
	        if (border_width > 0 && border_width < radius) {
		        
		        // offset caused by border
		        var offset = border_width/2; 
		        
		        if (r_type == 'tl') {
					var steps = new Array(radius-offset,offset,radius-offset,offset,offset,radius-offset);
					var curve_to = new Array(0,0);
				} else if (r_type == 'tr') {
					var steps = new Array(radius-offset,radius-offset,radius-offset,offset,offset,offset);
					var curve_to = new Array(0,0);
				} else if (r_type == 'bl') {
					var steps = new Array(radius-offset,radius-offset,offset,radius-offset,offset,offset,offset,radius-offset);
					var curve_to = new Array(0,0);
				} else if (r_type == 'br') {
					var steps = new Array(radius-offset,offset,radius-offset,offset,offset,radius-offset,radius-offset,radius-offset);
					var curve_to = new Array(radius, radius);
				}
		        
		        ctx.strokeStyle = border_color;
		        ctx.lineWidth = border_width;
	    		ctx.beginPath();
	    		// go to corner to begin curve
	     		ctx.moveTo(steps[0], steps[1]); 
	     		// curve from righttop to leftbottom (for the tl canvas)
	    		ctx.bezierCurveTo(steps[2], steps[3], curve_to[0], curve_to[1], steps[4], steps[5]); 
				ctx.stroke();
		        
		    }
		};
		
		var creatCanvas = function(p,radius) {
			var elm = document.createElement('canvas');
			elm.setAttribute("height", radius);
    		elm.setAttribute("width", radius); 
			elm.style.display = "block";
			elm.style.position = "absolute";
			elm.className = "cornercanvas";
			elm = p.appendChild(elm); 
			// if G_vmlCanvasManager in defined the browser (ie only) has loaded excanvas.js 
			if (!elm.getContext && typeof G_vmlCanvasManager != 'undefined') {
				var elm = G_vmlCanvasManager.initElement(elm);
			}
			return elm;
		};
		
		// interpret the (string) argument
   		var o = (options || "").toLowerCase();
   		var radius = parseInt((o.match(/(\d+)px/)||[])[1]) || null; // corner width
   		var bg_color = ((o.match(/(#[0-9a-f]+)/)||[])[1]);  // strip color
   		if (radius == null) { radius = "auto"; }
   		
   		var edges = { T:0, B:1 };
    	var opts = {
        	tl:  /top|tl/.test(o),       
        	tr:  /top|tr/.test(o),
        	bl:  /bottom|bl/.test(o),    
        	br:  /bottom|br/.test(o)
    	};
    	if ( !opts.tl && !opts.tr && !opts.bl && !opts.br) {
        	opts = { tl:1, tr:1, bl:1, br:1 };
        }
      
		return this.each(function() {

			var elm = $(this);
			
			// give the element 'haslayout'
	   		if ($.browser.msie) { this.style.zoom = 1; }
			
			// the size of the corner is not defined...
			var widthheight_smallest = getMin(new Array(getCSSint(this,'height'),getCSSint(this,'width')));
			if (radius == "auto") {
				radius = widthheight_smallest/4;
				if (radius > 10) { radius = 10; }
			}

			// the size of the corner can't be to high
			if (widthheight_smallest < radius) { 
				radius = (widthheight_smallest/2); 
			}
			
			// remove old canvas objects
			elm.children("canvas.cornercanvas").remove();
			
			// some css thats required in order to position the canvas elements
			if (elm.css('position') == 'static') { 
				elm.css('position','relative'); 
			// only needed for ie6 and (ie7 in Quirks mode) , CSS1Compat == Strict mode
			} else if (elm.css('position') == 'fixed' && $.browser.msie && !(document.compatMode == 'CSS1Compat' && typeof document.body.style.maxHeight != "undefined")) { 
				elm.css('position','absolute'); 
			}
			elm.css('overflow','visible'); 
			
			// get border width
			var border_t = getCSSint(this, 'borderTopWidth');
			var border_r = getCSSint(this, 'borderRightWidth');
			var border_b = getCSSint(this, 'borderBottomWidth');
			var border_l = getCSSint(this, 'borderLeftWidth');
			
			// get the lowest borderwidth of the corners in use
			var bordersWidth = new Array();
			if (opts.tl || opts.tr) { bordersWidth.push(border_t); }
			if (opts.br || opts.tr) { bordersWidth.push(border_r); }
			if (opts.br || opts.bl) { bordersWidth.push(border_b); }
			if (opts.bl || opts.tl) { bordersWidth.push(border_l); }
			
			borderswidth_smallest = getMin(bordersWidth);
			
			// creat the canvas elements and position them
			var p_top = 0-border_t;
			var p_right = 0-border_r;
			var p_bottom = 0-border_b;
			var p_left = 0-border_l;	

			if (opts.tl) { var tl = $(creatCanvas(this,radius)).css({left:p_left,top:p_top}).get(0); }
			if (opts.tr) { var tr = $(creatCanvas(this,radius)).css({right:p_right,top:p_top}).get(0); }
			if (opts.bl) { var bl = $(creatCanvas(this,radius)).css({left:p_left,bottom:p_bottom}).get(0); }
			if (opts.br) { var br = $(creatCanvas(this,radius)).css({right:p_right,bottom:p_bottom}).get(0); }
			
			// get the background color of parent element
			
			if (bg_color == undefined) {
				
				var current_p = elm.parent();
				var bg = current_p.css('background-color');
				while((bg == "transparent" || bg == "rgba(0, 0, 0, 0)") && current_p.get(0).tagName.toLowerCase() != "html") {
					bg = current_p.css('background-color');
					current_p = current_p.parent();
				}
			} else {
				bg = bg_color;
			}

			if (bg == "transparent" || bg == "rgba(0, 0, 0, 0)") { bg = "#ffffff"; }
			
			if (opts.tl) { drawRoundCornerCanvasShape(tl,radius,'tl',bg,borderswidth_smallest,elm.css('borderTopColor')); }
			if (opts.tr) { drawRoundCornerCanvasShape(tr,radius,'tr',bg,borderswidth_smallest,elm.css('borderTopColor')); }
			if (opts.bl) { drawRoundCornerCanvasShape(bl,radius,'bl',bg,borderswidth_smallest,elm.css('borderBottomColor')); }
			if (opts.br) { drawRoundCornerCanvasShape(br,radius,'br',bg,borderswidth_smallest,elm.css('borderBottomColor')); }
			
			elm.addClass('roundCornersParent');
				
   		});  
	};
	
	if ($.browser.msie && typeof G_vmlCanvasManager == 'undefined') {
		
		var corner_buffer = new Array();
		var corner_buffer_args = new Array();
		
		$.fn.corner = function(options){
			corner_buffer[corner_buffer.length] = this;
    		corner_buffer_args[corner_buffer_args.length] = options;
			return this.each(function(){});
		};
		
		// load excanvas.pack.js
		document.execCommand("BackgroundImageCache", false, true);
		var elm = $("script[@src*=jquery.corner.]");
		if (elm.length == 1) {
			var jc_src = elm.attr('src');
			var pathArray = jc_src.split('/');
			pathArray.pop();
			var base = pathArray.join('/') || '.';
			var excanvasjs = base+'/excanvas.pack.js';
			$.getScript(excanvasjs,function(){
				 execbuffer();
			});
		}
		
		var execbuffer = function() {
			// set back function
			$.fn.corner = _corner;
			// execute buffer and set back function
			for(var i=0;i<corner_buffer.length;i++){
				corner_buffer[i].corner(corner_buffer_args[i]);
			}
			corner_buffer = null;
			corner_buffer_args = null;
		}
		
	} else {
		$.fn.corner = _corner;
	}
	
})(jQuery);
console.log("== jquery.prettybox.js ==");
(function($) {
    var createCanvas = function() {
        var canvas = document.createElement("canvas");
        if ("G_vmlCanvasManager" in window) {
            document.body.appendChild(canvas);
            canvas = G_vmlCanvasManager.initElement(canvas);
        }
        return canvas;
    };
    var DropShadow = function(backgroundColor, cornerRadius, shadowRadius, shadowOffset, shadowAlpha) {
        this.backgroundColor = backgroundColor;
        this.cornerRadius = cornerRadius;
        this.shadowRadius = Math.max(cornerRadius, shadowRadius);
        this.shadowOffset = shadowOffset;
        this.shadowAlpha = shadowAlpha;
        
        this.elmt = createCanvas();//document.createElement("canvas");
        this.elmt.style.position = "absolute";
    };

    DropShadow.prototype = {
        draw: function() {
            var darkColor = "rgba(128,128,128," + this.shadowAlpha + ")";
            var lightColor = "rgba(128,128,128,0)";
            
            var cornerRadius = this.cornerRadius;
            var shadowRadius = this.shadowRadius;
            var radiusDiff = shadowRadius - cornerRadius;
            var innerWidth = this.width - 2 * cornerRadius;
            var innerHeight = this.height - 2 * cornerRadius;
            
            var ctx = this.elmt.getContext("2d");
            ctx.translate(this.shadowRadius, this.shadowRadius);
            ctx.globalCompositeOperation = "copy";
            
            /*
             * Inside
             */
            ctx.fillStyle = darkColor;
            ctx.fillRect(-cornerRadius, -cornerRadius, this.width, this.height);
            
            /*
             * Corners
             */
            if (true) {
                // top left
                ctx.fillStyle = this._createRadialGradient(ctx, 0, 0, cornerRadius, shadowRadius, darkColor, lightColor);
                ctx.fillRect(-shadowRadius, -shadowRadius, shadowRadius, shadowRadius);
                
                // top right
                ctx.fillStyle = this._createRadialGradient(ctx, innerWidth, 0, cornerRadius, shadowRadius, darkColor, lightColor);
                ctx.fillRect(innerWidth, -shadowRadius, shadowRadius, shadowRadius);
                
                // bottom right
                ctx.fillStyle = this._createRadialGradient(ctx, innerWidth, innerHeight, cornerRadius, shadowRadius, darkColor, lightColor);
                ctx.fillRect(innerWidth, innerHeight, shadowRadius, shadowRadius);
                
                // bottom left
                ctx.fillStyle = this._createRadialGradient(ctx, 0, innerHeight, cornerRadius, shadowRadius, darkColor, lightColor);
                ctx.fillRect(-shadowRadius, innerHeight, shadowRadius, shadowRadius);
            }
            
            /*
             * Edges
             */
            if (true) {
                // top
                ctx.fillStyle = this._createLinearGradient(ctx, 0, -cornerRadius, 0, -shadowRadius, darkColor, lightColor);
                ctx.fillRect(0, -shadowRadius, innerWidth, radiusDiff);
                
                // right
                ctx.fillStyle = this._createLinearGradient(ctx, innerWidth + cornerRadius, 0, innerWidth + shadowRadius, 0, darkColor, lightColor);
                ctx.fillRect(innerWidth + cornerRadius, 0, radiusDiff, innerHeight);
                
                // bottom
                ctx.fillStyle = this._createLinearGradient(ctx, 0, innerHeight + cornerRadius, 0, innerHeight + shadowRadius, darkColor, lightColor);
                ctx.fillRect(0, innerHeight + cornerRadius, innerWidth, radiusDiff);
                
                // left
                ctx.fillStyle = this._createLinearGradient(ctx, -radiusDiff, 0, -shadowRadius, 0, darkColor, lightColor);
                ctx.fillRect(-shadowRadius, 0, radiusDiff, innerHeight);
            }
            
            /*
             * Foreground
             */
            if (true) {
                ctx.translate(-this.shadowOffset, -this.shadowOffset);
                
                var curvy = 0.5;
                
                ctx.moveTo(-cornerRadius, 0);
                ctx.bezierCurveTo(
                    -cornerRadius, -cornerRadius * (1 - curvy), 
                    -cornerRadius * (1 - curvy), -cornerRadius, 
                    0, -cornerRadius);
                    
                ctx.lineTo(innerWidth, -cornerRadius);
                ctx.bezierCurveTo(
                    innerWidth + cornerRadius * (1 - curvy), -cornerRadius, 
                    innerWidth + cornerRadius, -cornerRadius * (1 - curvy), 
                    innerWidth + cornerRadius, 0);
                
                ctx.lineTo(innerWidth + cornerRadius, innerHeight);
                ctx.bezierCurveTo(
                    innerWidth + cornerRadius, innerHeight + cornerRadius * (1 - curvy), 
                    innerWidth + cornerRadius * (1 - curvy), innerHeight + cornerRadius, 
                    innerWidth, innerHeight + cornerRadius);
                    
                ctx.lineTo(0, innerHeight + cornerRadius);
                ctx.bezierCurveTo(
                    -cornerRadius * (1 - curvy), innerHeight + cornerRadius, 
                    -cornerRadius, innerHeight + cornerRadius * (1 - curvy), 
                    -cornerRadius, innerHeight);
                    
                ctx.closePath();
                
                ctx.fillStyle = this.backgroundColor;
                ctx.fill();
            }
        },
        move: function(left, top, width, height) {
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
            
            var radiusDiff = this.shadowRadius - this.cornerRadius;
            var elmt = this.elmt;
            elmt.style.top = (this.top - radiusDiff + this.shadowOffset) + "px";
            elmt.style.left = (this.left - radiusDiff + this.shadowOffset) + "px";
            elmt.style.width = (this.width + 2 * radiusDiff) + "px";
            elmt.style.height = (this.height + 2 * radiusDiff) + "px";
            elmt.width = this.width + 2 * radiusDiff;
            elmt.height = this.height + 2 * radiusDiff;
            
            this.draw();
        },
        _createRadialGradient: function(ctx, x, y, r1, r2, darkColor, lightColor) {
            var g = ctx.createRadialGradient(x, y, r1, x, y, r2);
            g.addColorStop(0, darkColor);
            g.addColorStop(1, lightColor);
            return g;
        },
        _createLinearGradient: function(ctx, x1, y1, x2, y2, darkColor, lightColor) {
            var g = ctx.createLinearGradient(x1, y1, x2, y2);
            g.addColorStop(0, darkColor);
            g.addColorStop(1, lightColor);
            return g;
        }
    };

    $.fn.extend({
        prettybox: function(cornerRadius, shadowRadius, shadowOffset, shadowAlpha) {
            this.each(function() {
                var elem = $(this);
                var bgColor = elem.css('background-color');
                var positions = elem.position();
                var pbox = new DropShadow(bgColor, cornerRadius, shadowRadius,
                                          shadowOffset, shadowAlpha);
                elem.parent().append(pbox.elmt);
                pbox.move(positions.left, positions.top,
                          elem.outerWidth(), elem.outerHeight());
                elem.css('background', 'transparent');
                elem.css('border', '0px');
            });
            return this;
        }
    });

}) (jQuery);
console.log("== dstructs.js ==");
/*
 * Copyright (c) 2007 Mason Tang 
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

DStructs = {};

DStructs.Array = function() {
    // Clean, slightly slow method of extending Array
    var x = [], a = arguments;
    for (var i = 0; i < a.length; i++) {
        if (a[i] instanceof Array) {

        } else {
            x.push(a[i]);
        }
    }
    for (var i in this) { x[i] = this[i]; }
    return x;
};
DStructs.Array.prototype = new Array();

// We need to rewrite a few Array methods to return DStructs.Array objects
DStructs.Array.prototype.slice = function(start, end) {
    if (start < 0) { start = this.length + start; }
    if (end == null) { end = this.length; }
    else if (end < 0) { end = this.length + end; }
    var a = new DStructs.Array();
    for (var i = start; i < end; i++) { a.push(this[i]); }
    return a;
};
DStructs.Array.prototype.concat = function() { 
    var arrays = arguments;
    var result = this.clone();
    for (var i = 0; i < arrays.length; i++) {
        if (arrays[i] instanceof Array) {
            result.addAll(arrays[i]);
        }
    }
    return result;
};
DStructs.Array.prototype.addAll = function(a) {
    for (var i = 0; i < a.length; i++) {
        this.push(a[i]);
    }
    return this;
};
DStructs.Array.prototype.map_i = function(f) {
    var self = this;
    return this.each(function(e, i) { self[i] = f(e, i); });
};
DStructs.Array.prototype.map = function(f) {
    var clone = new DStructs.Array();
    this.each(function(e, i) { clone.push(f(e, i)); });
    return clone;
};
DStructs.Array.prototype.filter = function(f) {
    var clone = new DStructs.Array();
    this.each(function(e, i) { if (f(e, i)) { clone.push(e); } });
    return clone;
};
DStructs.Array.prototype.filter_i = function(f) {

};
DStructs.Array.prototype.each = function(f) {
    for (var i = 0; i < this.length; i++) {
        f(this[i], i);
    }
    return this;
};
DStructs.Array.prototype.reduce = function(init, f) {
    for (var i = 0, len = this.length, result = init; i < len; i++) {
        result = f.call(this, result, this[i]);
    }
    return result;
};
DStructs.Array.prototype.zip = function() {

};
DStructs.Array.prototype.indexOf = function(obj) {
    var indices = this.indicesOf(obj);
    if (!indices.empty()) { return indices[0]; }
    return -1;
};
DStructs.Array.prototype.indicesOf = function(obj) {
    var indices = new DStructs.Array();
    this.each(function(e, i) { if (obj == e) { indices.push(i); } });
    return indices;
};
DStructs.Array.prototype.remove = function(obj) {
    var removed = 0;
    while (this.contains(obj)) {
    }
    return removed;
};
DStructs.Array.prototype.contains = function(obj) {
    return this.indexOf(obj) >= 0;
};
DStructs.Array.prototype.uniq_i = function() {
    var hash = new DStructs.Hash();
    var indices = new DStructs.Array();
    var self = this;
    this.each(function(e, i) {
        if (hash.contains(e)) { 
            indices.push(i);
        } else {
            hash.put(e, i);
        }
    });
    return this;
};
DStructs.Array.prototype.uniq = function() {
    var hash = new DStructs.Hash();
    this.each(function(e) { hash.put(e, e); });
    return hash.values();
};
DStructs.Array.prototype.empty = function() {
    return this.length == 0;
};
DStructs.Array.prototype.clear = function() {
    this.length = 0;
};
DStructs.Array.prototype.clone = function() {
    var clone = new DStructs.Array();
    this.each(function(e) { clone.push(e); });
    return clone;
};
DStructs.Array.prototype.iterator = function() {
    return new DStructs.Iterator(this);
};

DStructs.Iterator = function(items) {
    var index = 0;
    this.hasNext = function() {
        return index < items.length;
    };
    this.next = function() {
        index++;
        return items[index - 1];
    };
};


DStructs.Hash = function() {
    var dataStore = {};
    var count;
    
    this.put = function(key, value) {
        var success = !(key in dataStore);
        dataStore[key] = value;
        if (success) { count++; }
        return success;
    };
    
    this.contains = function(key) {
        return key in dataStore;
    };
    
    this.size = function() {
        return count;
    };
    
    this.each = function(f) {
        for (var key in dataStore) {
            f(dataStore[key], key);
        }
        return this;
    };
    
    this.values = function() {
        var values = new DStructs.Array();
        this.each(function(v, k) { values.push(v); });
        return values;
    };
    
    this.keys = function() {
        var keys = new DStructs.Array();
        this.each(function(v, k) { keys.push(k); });
        return keys;
    };
    
};
console.log("== controls.js ==");
/**
 * Controls
 */

Timegrid.Controls = {};

/*
 * A panel will render controls around a set of layouts.  This should be the
 * only entrypoint into this code, in addition to the render method.
 * Possible controls include:
 *    Switching between the layouts (tabs)
 *    Iterating through time, different weeks/months, etc (arrows)
 *    Switching between data sources
 * The style and selection of which types of controls to render in the panel
 * should be easily configurable through the params hash passed in.
 */
Timegrid.Controls.Panel = function(layouts, params) {
    this._layouts = layouts;
    this._titles = $.map(this._layouts, function(l) { return l.title; });
    this._tabSet = new Timegrid.Controls.TabSet(this._titles, this._layouts);
};

Timegrid.Controls.Panel.prototype.setLayouts = function(layouts) {
    this._layouts = layouts;
    this._titles = $.map(this._layouts, function(l) { return l.title; });
    this._tabSet.setLayouts(this._titles, this._layouts);
};

Timegrid.Controls.Panel.prototype.render = function(container) {
    this._tabSet.render(container);
    this._tabSet.switchTo(this._tabSet.current || this._titles[0]);
};

Timegrid.Controls.Panel.prototype.renderChanged = function() {
    this._tabSet.renderChanged();
    this._tabSet.switchTo(this._tabSet.current || this._titles[0]);
};

/*
 * TabSet is a style of control that generates a set of tabs.  These tabs can
 * be configured to switch between different views, time slices, or data
 * sources.
 */
Timegrid.Controls.TabSet = function(titles, layouts) {
    this.setLayouts(titles, layouts);
    this.current          = "";
};

Timegrid.Controls.TabSet.prototype.setLayouts = function(titles, layouts) {
    this._tabs            = {};
    this._renderedLayouts = {};
    this._iterators       = {};
    this._layoutMap = {};
    for (var i = 0; i < titles.length; i++) {
        this._layoutMap[titles[i]] = layouts[i];
    }
};

Timegrid.Controls.TabSet.prototype.render = function(container) {
    this._container = container;
    var self = this;
    var tabDiv = $('<div></div>').addClass('timegrid-tabs');
    $(container).prepend(tabDiv);
    var makeCallback = function(title) {
        return function() { self.switchTo(title); }; 
    };
    for (var lTitle in this._layoutMap) {
        var tab = $('<div><a href="javascript:void">' + lTitle + '</a></div>')
                    .height(this._layoutMap[lTitle].tabHeight + "px")
                    .click(makeCallback(lTitle))
                    .addClass('timegrid-tab').addClass('timegrid-rounded');
        tabDiv.prepend(tab);
        this._tabs[lTitle] = tab;
    }
    if (!$.browser.msie) { $('.timegrid-tab').corner("30px top"); }
};

Timegrid.Controls.TabSet.prototype.renderChanged = function() {
    var layout = this._layoutMap[this.current];
    layout.renderChanged();
};

Timegrid.Controls.TabSet.prototype.switchTo = function(title) {
    if (this.current && this._renderedLayouts[this.current]) { 
        this._renderedLayouts[this.current].hide();
        this._tabs[this.current].removeClass('timegrid-tab-active'); 
    }
    if (this._renderedLayouts[title]) {
        this._renderedLayouts[title].show();
    } else if (this._layoutMap[title]) {
        this._renderedLayouts[title] = $(this._layoutMap[title].render(this._container)).show();
    }
    if (this._iDiv) { $(this._iDiv).empty(); }
    if (this._layoutMap[title].iterable) {
        if (!this._iterators[title]) {
            this._iterators[title] = new Timegrid.Controls.Iterator(this._layoutMap[title]);
            this._iDiv = $(this._iterators[title].render(this._container));
        } else {
            this._iDiv = $(this._iterators[title].render());
        }
    }
    this.current = title;
    this._tabs[this.current].addClass('timegrid-tab-active');
};

/*
 * Iterator is a style of control that generates a textual label for the
 * current selection and a set of arrows for moving to either the previous
 * or next selection.  Can be used for views, time, or sources.
 */
Timegrid.Controls.Iterator = function(layout) {
    this._layout = layout;
};

Timegrid.Controls.Iterator.prototype.render = function(container) {
    if (container) {
        this._container = container;
        this._div = $('<div></div>').addClass('timegrid-iterator');
        $(this._container).prepend(this._div);
    } else {
        this._div.empty();
    }
    var self = this;
    var makePrevCallback = function(layout) {
        return function() {
            layout.goPrevious();
            self.render();
        };
    };
    var makeNextCallback = function(layout) {
        return function() {
            layout.goNext();
            self.render();
        };
    };
    var prevLink = $('<img alt="Previous" src="' + Timegrid.urlPrefix + '/images/go-previous.png"></img>')
                   .wrap('<a href="javascript:void"></a>').parent()
                   .addClass('timegrid-iterator-prev')
                   .click(makePrevCallback(this._layout));
    var nextLink = $('<img alt="Next" src="' + Timegrid.urlPrefix + '/images/go-next.png"></img>')
                   .wrap('<a href="javascript:void"></a>').parent()
                   .addClass('timegrid-iterator-next')
                   .click(makeNextCallback(this._layout));
    this._div.append(prevLink);
    this._div.append(nextLink);
    this._div.append('<span>' + this._layout.getCurrent() + '</span>');
    return this._div;
};
Timegrid.ListenerAware = function() {
    this._listeners = [];
};

Timegrid.ListenerAware.prototype.addListener = function(listener) {
    this._listeners.push(listener);
};

Timegrid.ListenerAware.prototype.removeListener = function(listener) {
    for (var i = 0; i < this._listeners.length; i++) {
        if (this._listeners[i] == listener) {
            this._listeners.splice(i, 1);
            break;
        }
    }
};

Timegrid.ListenerAware.prototype._fire = function(handlerName, args) {
    for (var i = 0; i < this._listeners.length; i++) {
        var listener = this._listeners[i];
        if (handlerName in listener) {
            try {
                listener[handlerName].apply(listener, args);
            } catch (e) {
                Timegrid.Debug.exception(e);
            }
        }
    }
};
/******************************************************************************
 * Grid
 *   Grid is the primary data structure that stores events for Timegrid to 
 *   process and render out to the client.
 *****************************************************************************/

Timegrid.Grid = function(objs, xSize, ySize, xMapper, yMapper) {
    Timegrid.Grid.superclass.call(this);
    // Construct the actual array container for objects
    this.grid = new Array(xSize);
    for (i = 0; i < xSize; i++) {
        this.grid[i] = new Array(ySize);
        for (j = 0; j < ySize; j++) {
            this.grid[i][j] = [];
        }
    }
    this.xMapper = xMapper;
    this.yMapper = yMapper;
    this.size = 0;

    this.addAll(objs);
};
$.inherit(Timegrid.Grid, Timegrid.ListenerAware);

Timegrid.Grid.prototype.add = function(obj) {
    var x = this.xMapper(obj);
    var y = this.yMapper(obj);
    this.get(x,y).push(obj);
    this.size++;
};

Timegrid.Grid.prototype.addAll = function(objs) {
    for (i in objs) { this.add(objs[i]); }
};

Timegrid.Grid.prototype.remove = function(obj) {
    var x = this.xMapper(obj);
    var y = this.yMapper(obj);
    var objs = this.get(x,y);
    for (i = 0; i < objs.length; i++) {
        if (obj == objs[i]) {
            objs.splice(i, 1);
            this.size--;
            return true;
        }
    }
    return false;
};

Timegrid.Grid.prototype.get = function(x, y) {
    return this.grid[x][y];
};

Timegrid.Grid.prototype.getSize = function() {
    return this.size;
};
/*==================================================
 *  Classic Theme
 *==================================================
 */


Timegrid.ClassicTheme = new Object();

Timegrid.ClassicTheme.implementations = [];

Timegrid.ClassicTheme.create = function(locale) {
    if (locale == null) {
        locale = Timegrid.Platform.getDefaultLocale();
    }
    
    var f = Timegrid.ClassicTheme.implementations[locale];
    if (f == null) {
        f = Timegrid.ClassicTheme._Impl;
    }
    return new f();
};

Timegrid.ClassicTheme._Impl = function() {
    this.firstDayOfWeek = 0; // Sunday
    
    this.ether = {
        backgroundColors: [
            "#EEE",
            "#DDD",
            "#CCC",
            "#AAA"
        ],
        highlightColor:     "white",
        highlightOpacity:   50,
        interval: {
            line: {
                show:       true,
                color:      "#aaa",
                opacity:    25
            },
            weekend: {
                color:      "#FFFFE0",
                opacity:    30
            },
            marker: {
                hAlign:     "Bottom",
                hBottomStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-bottom";
                },
                hBottomEmphasizedStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-bottom-emphasized";
                },
                hTopStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-top";
                },
                hTopEmphasizedStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-top-emphasized";
                },
                    
                vAlign:     "Right",
                vRightStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-right";
                },
                vRightEmphasizedStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-right-emphasized";
                },
                vLeftStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-left";
                },
                vLeftEmphasizedStyler:function(elmt) {
                    elmt.className = "timeline-ether-marker-left-emphasized";
                }
            }
        }
    };
    
    this.event = {
        track: {
            offset:         0.5, // em
            height:         1.5, // em
            gap:            0.5  // em
        },
        instant: {
            icon:           Timegrid.urlPrefix + "images/dull-blue-circle.png",
            lineColor:      "#58A0DC",
            impreciseColor: "#58A0DC",
            impreciseOpacity: 20,
            showLineForNoText: true
        },
        duration: {
            color:          "#58A0DC",
            opacity:        100,
            impreciseColor: "#58A0DC",
            impreciseOpacity: 20
        },
        label: {
            insideColor:    "white",
            outsideColor:   "black",
            width:          200 // px
        },
        highlightColors: [
            "#FFFF00",
            "#FFC000",
            "#FF0000",
            "#0000FF"
        ],
        bubble: {
            width:          250, // px
            height:         125, // px
            titleStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-title";
            },
            bodyStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-body";
            },
            imageStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-image";
            },
            wikiStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-wiki";
            },
            timeStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-time";
            }
        }
    };
};
/*==================================================
 *  Gregorian Date Labeller
 *==================================================
 */

Timegrid.GregorianDateLabeller = function(locale, timeZone) {
    this._locale = locale;
    this._timeZone = timeZone;
};

Timegrid.GregorianDateLabeller.monthNames = [];
Timegrid.GregorianDateLabeller.dayNames = [];
Timegrid.GregorianDateLabeller.labelIntervalFunctions = [];

Timegrid.GregorianDateLabeller.getMonthName = function(month, locale) {
    return Timegrid.GregorianDateLabeller.monthNames[locale][month];
};

Timegrid.GregorianDateLabeller.prototype.labelInterval = function(date, intervalUnit) {
    var f = Timegrid.GregorianDateLabeller.labelIntervalFunctions[this._locale];
    if (f == null) {
        f = Timegrid.GregorianDateLabeller.prototype.defaultLabelInterval;
    }
    return f.call(this, date, intervalUnit);
};

Timegrid.GregorianDateLabeller.prototype.labelPrecise = function(date) {
    return SimileAjax.DateTime.removeTimeZoneOffset(
        date, 
        this._timeZone //+ (new Date().getTimezoneOffset() / 60)
    ).toUTCString();
};

Timegrid.GregorianDateLabeller.prototype.defaultLabelInterval = function(date, intervalUnit) {
    var text;
    var emphasized = false;
    
    date = SimileAjax.DateTime.removeTimeZoneOffset(date, this._timeZone);
    
    switch(intervalUnit) {
    case SimileAjax.DateTime.MILLISECOND:
        text = date.getUTCMilliseconds();
        break;
    case SimileAjax.DateTime.SECOND:
        text = date.getUTCSeconds();
        break;
    case SimileAjax.DateTime.MINUTE:
        var m = date.getUTCMinutes();
        if (m == 0) {
            text = date.getUTCHours() + ":00";
            emphasized = true;
        } else {
            text = m;
        }
        break;
    case SimileAjax.DateTime.HOUR:
        text = date.getUTCHours() + "hr";
        break;
    case SimileAjax.DateTime.DAY:
        text = Timegrid.GregorianDateLabeller.getMonthName(date.getUTCMonth(), this._locale) + " " + date.getUTCDate();
        break;
    case SimileAjax.DateTime.WEEK:
        text = Timegrid.GregorianDateLabeller.getMonthName(date.getUTCMonth(), this._locale) + " " + date.getUTCDate();
        break;
    case SimileAjax.DateTime.MONTH:
        var m = date.getUTCMonth();
        if (m != 0) {
            text = Timegrid.GregorianDateLabeller.getMonthName(m, this._locale);
            break;
        } // else, fall through
    case SimileAjax.DateTime.YEAR:
    case SimileAjax.DateTime.DECADE:
    case SimileAjax.DateTime.CENTURY:
    case SimileAjax.DateTime.MILLENNIUM:
        var y = date.getUTCFullYear();
        if (y > 0) {
            text = date.getUTCFullYear();
        } else {
            text = (1 - y) + "BC";
        }
        emphasized = 
            (intervalUnit == SimileAjax.DateTime.MONTH) ||
            (intervalUnit == SimileAjax.DateTime.DECADE && y % 100 == 0) || 
            (intervalUnit == SimileAjax.DateTime.CENTURY && y % 1000 == 0);
        break;
    default:
        text = date.toUTCString();
    }
    return { text: text, emphasized: emphasized };
}
/******************************************************************************
 *  Default Event Source
 *****************************************************************************/

console.log("== default.js ==");
Timegrid.DefaultEventSource = function(eventIndex) {
    Timegrid.DefaultEventSource.superclass.call(this);
    this._events = (eventIndex instanceof Object) ? eventIndex : new SimileAjax.EventIndex();
};
$.inherit(Timegrid.DefaultEventSource, Timegrid.ListenerAware);

Timegrid.DefaultEventSource.prototype.loadXML = function(xml, url) {
    var base = this._getBaseURL(url);
    
    var wikiURL = xml.documentElement.getAttribute("wiki-url");
    var wikiSection = xml.documentElement.getAttribute("wiki-section");

    var dateTimeFormat = xml.documentElement.getAttribute("date-time-format");
    var parseDateTimeFunction = this._events.getUnit().getParser(dateTimeFormat);

    var node = xml.documentElement.firstChild;
    var added = false;
    while (node != null) {
        if (node.nodeType == 1) {
            var description = "";
            if (node.firstChild != null && node.firstChild.nodeType == 3) {
                description = node.firstChild.nodeValue;
            }
            var evt = new Timegrid.DefaultEventSource.Event(
                parseDateTimeFunction(node.getAttribute("start")),
                parseDateTimeFunction(node.getAttribute("end")),
                parseDateTimeFunction(node.getAttribute("latestStart")),
                parseDateTimeFunction(node.getAttribute("earliestEnd")),
                node.getAttribute("isDuration") != "true",
                node.getAttribute("title"),
                description,
                this._resolveRelativeURL(node.getAttribute("image"), base),
                this._resolveRelativeURL(node.getAttribute("link"), base),
                this._resolveRelativeURL(node.getAttribute("icon"), base),
                node.getAttribute("color"),
                node.getAttribute("textColor")
            );
            evt._node = node;
            evt.getProperty = function(name) {
                return this._node.getAttribute(name);
            };
            evt.setWikiInfo(wikiURL, wikiSection);
            
            this._events.add(evt);
            
            added = true;
        }
        node = node.nextSibling;
    }

    if (added) {
        this._fire("onAddMany", []);
    }
};


Timegrid.DefaultEventSource.prototype.loadJSON = function(data, url) {
    var base = this._getBaseURL(url);
    var added = false;  
    if (data && data.events){
        var wikiURL = ("wikiURL" in data) ? data.wikiURL : null;
        var wikiSection = ("wikiSection" in data) ? data.wikiSection : null;
    
        var dateTimeFormat = ("dateTimeFormat" in data) ? data.dateTimeFormat : null;
        var parseDateTimeFunction = this._events.getUnit().getParser(dateTimeFormat);
       
        for (var i=0; i < data.events.length; i++){
            var event = data.events[i];
            if (!(event.start || event.end || 
                  event.latestStart || event.earliestEnd)) {
                continue; 
            }
            var evt = new Timegrid.DefaultEventSource.Event(
                parseDateTimeFunction(event.start),
                parseDateTimeFunction(event.end),
                parseDateTimeFunction(event.latestStart),
                parseDateTimeFunction(event.earliestEnd),
                event.isDuration || false,
                event.title,
                event.description,
                this._resolveRelativeURL(event.image, base),
                this._resolveRelativeURL(event.link, base),
                this._resolveRelativeURL(event.icon, base),
                event.color,
                event.textColor
            );
            evt._obj = event;
            evt.getProperty = function(name) {
                return this._obj[name];
            };
            evt.setWikiInfo(wikiURL, wikiSection);
            this._events.add(evt);
            added = true;
        }
    }
    if (added) {
        this._fire("onAddMany", []);
    }
};

/*
 *  Contributed by Morten Frederiksen, http://www.wasab.dk/morten/
 */
Timegrid.DefaultEventSource.prototype.loadSPARQL = function(xml, url) {
    var base = this._getBaseURL(url);
    
    var dateTimeFormat = 'iso8601';
    var parseDateTimeFunction = this._events.getUnit().getParser(dateTimeFormat);

    if (xml == null) {
        return;
    }
    
    /*
     *  Find <results> tag
     */
    var node = xml.documentElement.firstChild;
    while (node != null && (node.nodeType != 1 || node.nodeName != 'results')) {
        node = node.nextSibling;
    }
    
    var wikiURL = null;
    var wikiSection = null;
    if (node != null) {
        wikiURL = node.getAttribute("wiki-url");
        wikiSection = node.getAttribute("wiki-section");
        
        node = node.firstChild;
    }
    
    var added = false;
    while (node != null) {
        if (node.nodeType == 1) {
            var bindings = { };
            var binding = node.firstChild;
            while (binding != null) {
                if (binding.nodeType == 1 && 
                    binding.firstChild != null && 
                    binding.firstChild.nodeType == 1 && 
                    binding.firstChild.firstChild != null && 
                    binding.firstChild.firstChild.nodeType == 3) {
                    bindings[binding.getAttribute('name')] = binding.firstChild.firstChild.nodeValue;
                }
                binding = binding.nextSibling;
            }
            
            if (bindings["start"] == null && bindings["date"] != null) {
                bindings["start"] = bindings["date"];
            }
            
            var evt = new Timegrid.DefaultEventSource.Event(
                parseDateTimeFunction(bindings["start"]),
                parseDateTimeFunction(bindings["end"]),
                parseDateTimeFunction(bindings["latestStart"]),
                parseDateTimeFunction(bindings["earliestEnd"]),
                bindings["isDuration"] != "true",
                bindings["title"],
                bindings["description"],
                this._resolveRelativeURL(bindings["image"], base),
                this._resolveRelativeURL(bindings["link"], base),
                this._resolveRelativeURL(bindings["icon"], base),
                bindings["color"],
                bindings["textColor"]
            );
            evt._bindings = bindings;
            evt.getProperty = function(name) {
                return this._bindings[name];
            };
            evt.setWikiInfo(wikiURL, wikiSection);
            
            this._events.add(evt);
            added = true;
        }
        node = node.nextSibling;
    }

    if (added) {
        this._fire("onAddMany", []);
    }
};

Timegrid.DefaultEventSource.prototype.add = function(evt) {
    this._events.add(evt);
    this._fire("onAddOne", [evt]);
};

Timegrid.DefaultEventSource.prototype.addMany = function(events) {
    for (var i = 0; i < events.length; i++) {
        this._events.add(events[i]);
    }
    this._fire("onAddMany", []);
};

Timegrid.DefaultEventSource.prototype.clear = function() {
    this._events.removeAll();
    this._fire("onClear", []);
};

Timegrid.DefaultEventSource.prototype.getEventIterator = function(startDate, endDate) {
    return this._events.getIterator(startDate, endDate);
};

Timegrid.DefaultEventSource.prototype.getAllEventIterator = function() {
    return this._events.getAllIterator();
};

Timegrid.DefaultEventSource.prototype.getCount = function() {
    return this._events.getCount();
};

Timegrid.DefaultEventSource.prototype.getEarliestDate = function() {
    return this._events.getEarliestDate();
};

Timegrid.DefaultEventSource.prototype.getLatestDate = function() {
    return this._events.getLatestDate();
};

Timegrid.DefaultEventSource.prototype._getBaseURL = function(url) {
    if (url.indexOf("://") < 0) {
        var url2 = this._getBaseURL(document.location.href);
        if (url.substr(0,1) == "/") {
            url = url2.substr(0, url2.indexOf("/", url2.indexOf("://") + 3)) + url;
        } else {
            url = url2 + url;
        }
    }
    
    var i = url.lastIndexOf("/");
    if (i < 0) {
        return "";
    } else {
        return url.substr(0, i+1);
    }
};

Timegrid.DefaultEventSource.prototype._resolveRelativeURL = function(url, base) {
    if (url == null || url == "") {
        return url;
    } else if (url.indexOf("://") > 0) {
        return url;
    } else if (url.substr(0,1) == "/") {
        return base.substr(0, base.indexOf("/", base.indexOf("://") + 3)) + url;
    } else {
        return base + url;
    }
};


Timegrid.DefaultEventSource.Event = function(
        start, end, latestStart, earliestEnd, instant, 
        text, description, image, link,
        icon, color, textColor) {
        
    this._id = "e" + Math.floor(Math.random() * 1000000);
    
    this._instant = instant || (end == null);
    
    this._start = start;
    this._end = (end != null) ? end : start;
    
    this._latestStart = (latestStart != null) ? latestStart : (instant ? this._end : this._start);
    this._earliestEnd = (earliestEnd != null) ? earliestEnd : (instant ? this._start : this._end);
    
    this._text = SimileAjax.HTML.deEntify(text);
    this._description = SimileAjax.HTML.deEntify(description);
    this._image = (image != null && image != "") ? image : null;
    this._link = (link != null && link != "") ? link : null;
    
    this._icon = (icon != null && icon != "") ? icon : null;
    this._color = (color != null && color != "") ? color : null;
    this._textColor = (textColor != null && textColor != "") ? textColor : null;
    
    this._wikiURL = null;
    this._wikiSection = null;
};

Timegrid.DefaultEventSource.Event.prototype = {
    getID:          function() { return this._id; },
    
    isInstant:      function() { return this._instant; },
    isImprecise:    function() { return this._start != this._latestStart || this._end != this._earliestEnd; },
    
    getStart:       function() { return this._start; },
    getEnd:         function() { return this._end; },
    getLatestStart: function() { return this._latestStart; },
    getEarliestEnd: function() { return this._earliestEnd; },
    
    getText:        function() { return this._text; },
    getDescription: function() { return this._description; },
    getImage:       function() { return this._image; },
    getLink:        function() { return this._link; },
    
    getIcon:        function() { return this._icon; },
    getColor:       function() { return this._color; },
    getTextColor:   function() { return this._textColor; },

    getInterval: function() {
        return new SimileAjax.DateTime.Interval(this.getEnd() - 
                this.getStart());
    },
    
    getProperty:    function(name) { return null; },
    
    getWikiURL:     function() { return this._wikiURL; },
    getWikiSection: function() { return this._wikiSection; },
    setWikiInfo: function(wikiURL, wikiSection) {
        this._wikiURL = wikiURL;
        this._wikiSection = wikiSection;
    },
    
    fillDescription: function(elmt) {
        elmt.innerHTML = this._description;
    },
    fillWikiInfo: function(elmt) {
        if (this._wikiURL != null && this._wikiSection != null) {
            var wikiID = this.getProperty("wikiID");
            if (wikiID == null || wikiID.length == 0) {
                wikiID = this.getText();
            }
            wikiID = wikiID.replace(/\s/g, "_");
            
            var url = this._wikiURL + this._wikiSection.replace(/\s/g, "_") + "/" + wikiID;
            var a = document.createElement("a");
            a.href = url;
            a.target = "new";
            a.innerHTML = "Discuss";
            
            elmt.appendChild(document.createTextNode("["));
            elmt.appendChild(a);
            elmt.appendChild(document.createTextNode("]"));
        } else {
            elmt.style.display = "none";
        }
    },
    fillTime: function(elmt, labeller) {
        if (this._instant) {
            if (this.isImprecise()) {
                elmt.appendChild(elmt.ownerDocument.createTextNode(labeller.labelPrecise(this._start)));
                elmt.appendChild(elmt.ownerDocument.createElement("br"));
                elmt.appendChild(elmt.ownerDocument.createTextNode(labeller.labelPrecise(this._end)));
            } else {
                elmt.appendChild(elmt.ownerDocument.createTextNode(labeller.labelPrecise(this._start)));
            }
        } else {
            if (this.isImprecise()) {
                elmt.appendChild(elmt.ownerDocument.createTextNode(
                    labeller.labelPrecise(this._start) + " ~ " + labeller.labelPrecise(this._latestStart)));
                elmt.appendChild(elmt.ownerDocument.createElement("br"));
                elmt.appendChild(elmt.ownerDocument.createTextNode(
                    labeller.labelPrecise(this._earliestEnd) + " ~ " + labeller.labelPrecise(this._end)));
            } else {
                elmt.appendChild(elmt.ownerDocument.createTextNode(labeller.labelPrecise(this._start)));
                elmt.appendChild(elmt.ownerDocument.createElement("br"));
                elmt.appendChild(elmt.ownerDocument.createTextNode(labeller.labelPrecise(this._end)));
            }
        }
    },
    fillInfoBubble: function(elmt, theme, labeller) {
        var doc = elmt.ownerDocument;
        
        var title = this.getText();
        var link = this.getLink();
        var image = this.getImage();
        
        if (image != null) {
            var img = doc.createElement("img");
            img.src = image;
            
            theme.event.bubble.imageStyler(img);
            elmt.appendChild(img);
        }
        
        var divTitle = doc.createElement("div");
        var textTitle = doc.createTextNode(title);
        if (link != null) {
            var a = doc.createElement("a");
            a.href = link;
            a.appendChild(textTitle);
            divTitle.appendChild(a);
        } else {
            divTitle.appendChild(textTitle);
        }
        theme.event.bubble.titleStyler(divTitle);
        elmt.appendChild(divTitle);
        
        var divBody = doc.createElement("div");
        this.fillDescription(divBody);
        theme.event.bubble.bodyStyler(divBody);
        elmt.appendChild(divBody);
        
        var divTime = doc.createElement("div");
        this.fillTime(divTime, labeller);
        theme.event.bubble.timeStyler(divTime);
        elmt.appendChild(divTime);
        
        var divWiki = doc.createElement("div");
        this.fillWikiInfo(divWiki);
        theme.event.bubble.wikiStyler(divWiki);
        elmt.appendChild(divWiki);
    }
};
console.log("== recurring.js ==");
/**
 * @name Timegrid.RecurringEventSource
 * @author masont
 */
 
/**
 * A type of EventSource that allows the creation and display of recurring 
 * events that are not tied to a specific date, e.g. 8am on MWF.
 *
 * @constructor
 */
Timegrid.RecurringEventSource = function() {
    Timegrid.RecurringEventSource.superclass.call(this);
    
    /* 
     * The actual array containing event prototypes is kept private, and only
     * accessed/modified through priviledged methods created here, in the
     * constructor. 
     */
    var eventPrototypes = new DStructs.Array();
    
    //========================= Privileged Methods ==========================//
    
    /** Sets this source's event prototypes to the given prototypes */
    this.setEventPrototypes = function(a) {
        eventPrototypes.clear();
        this.addAllEventPrototypes(a);
    };
    
    /** Adds the given event prototype to this event source */
    this.addEventPrototype = function(eventPrototype) {
        eventPrototypes.push(eventPrototype);
        this._fire("onAddMany", []);
    };

    /** Adds all of the event prototypes from the given array */
    this.addAllEventPrototypes = function(a) {
        eventPrototypes.addAll(a);
        this._fire("onAddMany", []);
    };
    
    /** Removes the given event prototype from this source's prototypes */
    this.removeEventPrototype = function(eventPrototype) {
        return eventPrototypes.remove(eventPrototype);
    };
    
    /** Removes all of the event prototypes from this source */
    this.clearEventPrototypes = function() {
        eventPrototypes.clear();
        this._fire("onClear", []);
    };

    /** Generates events from event prototypes */
    this.generateEvents = function(startDate, endDate) {
        var result = new DStructs.Array();
        eventPrototypes.each(function(ep) {
            result.addAll(ep.generateEvents(startDate, endDate));
        });
        return result;
    };
};
$.inherit(Timegrid.RecurringEventSource, Timegrid.ListenerAware);

Timegrid.RecurringEventSource.prototype.loadXML = function(xml, url) {
    
};
Timegrid.RecurringEventSource.prototype.loadJSON = function(data, url) {
    
};
Timegrid.RecurringEventSource.prototype.getEventIterator = function(startDate, endDate) {
    return this.generateEvents(startDate, endDate).iterator();
};
Timegrid.RecurringEventSource.prototype.getEarliestDate = function() {
    return (new Date()).clearTime().setDay(0);
};
Timegrid.RecurringEventSource.prototype.getLatestDate = function() {
    return (new Date()).clearTime().setDay(7);
};

Timegrid.RecurringEventSource.EventPrototype = function(dayArray, start, end, 
        text, description, image, link, icon, color, textColor) {
    var id = "e" + Math.floor(Math.random() * 1000000);
    var days = new DStructs.Array(); days.addAll(dayArray);

    this.getDays = function() { return days; };
    this.getStart = function() { return start; };
    this.getEnd = function() { return end; };
    
    this.getID = function() { return id; }
    this.getText = function() { 
        return SimileAjax.HTML.deEntify(text); 
    };
    this.getDescription = function() { 
        return SimileAjax.HTML.deEntify(description); 
    };
    this.getImage = function() { 
        return (image != null && image != "") ? image : null;
    };
    this.getLink = function() {
        return (link != null && link != "") ? link : null;
    };
    this.getIcon = function() { 
        return (icon != null && icon != "") ? icon : null;
    };
    this.getColor = function() {
        return (color != null && color != "") ? color : null;
    };
    this.getTextColor = function() {
        return (textColor != null && textColor != "") ? textColor : null;
    }
    this.generateFrom = function(date) {
        if (!this.getDays().contains(date.getDay())) { return false; }
        var startTime = new Date(this.getStart());
        var endTime = new Date(this.getEnd());
        startTime.setDate(date.getDate());
        startTime.setMonth(date.getMonth());
        startTime.setFullYear(date.getFullYear());
        endTime.setDate(date.getDate());
        endTime.setMonth(date.getMonth());
        endTime.setFullYear(date.getFullYear());
        return new Timegrid.DefaultEventSource.Event(startTime, endTime, null,
                null, false, text, description, image, link, icon, color,
                textColor);
    };
};

Timegrid.RecurringEventSource.EventPrototype.prototype = {
    generateEvents: function(start, end) {
        var events = new DStructs.Array();
        for (var date = new Date(start); date < end; date.add('d', 1)) {
            var event = this.generateFrom(date);
            if (event) { events.push(event); }
        }
        return events;
    }
};
/**
 * @fileOverview
 *   This is where we define the entrypoint for  all of the different default 
 *   layouts that Timegrid is capable of, e.g. month, week, n-day, etc. Both
 *   LayoutFactory and the common Layout superclass are defined in this file.
 * @author masont
 */

/**
 * Constructs a LayoutFactory object.
 *
 * @class LayoutFactory is a simple factory class that abstracts the process of
 *     selecting and instantiating Layout objects.
 * @constructor
 */
Timegrid.LayoutFactory = function() {};

Timegrid.LayoutFactory._constructors = {};

/**
 * Registers a layout class with this layout factory.  Automatically places the
 * given layout under the common Layout superclass, and binds the name string
 * to the constructor.
 *
 * @param {String} name the name to bind to the given constructor
 * @param {Function} constructor the constructor to a layout class
 */
Timegrid.LayoutFactory.registerLayout = function(name, constructor) {
    $.inherit(constructor, Timegrid.Layout);
    Timegrid.LayoutFactory._constructors[name] = constructor;
};

/**
 * Instantiates a Timegrid layout with the given parameter hash.
 *
 * @param {String} name the name of the layout
 * @param {EventSource} eventSource an EventSource object to layout and render
 * @param params a hash of parameters to be passed into the desired layout
 * @return {Timegrid.Layout} a Timegrid.Layout instance of the specified subclass
 */
Timegrid.LayoutFactory.createLayout = function(name, eventSource, params) {
    var constructor = Timegrid.LayoutFactory._constructors[name];
    if (typeof constructor == 'function') {
        layout = new constructor(eventSource, $.clone(params));
        return layout;
    } else {
        throw "No such layout!";   
    };
    return;
};

/**
 * Instantiates a Layout object. This constructor should always be overridden.
 *
 * @class Layout is the base class for all layouts that Timegrid supports.
 * @constructor
 * @param {EventSource} eventSource the eventSource to pull events from
 * @param {Object} params a parameter hash
 */
Timegrid.Layout = function(eventSource, params) {
    var self = this;
    /**
     * An object containing a parameter hash
     * @type Object
     */
    this.params = params;
    /**
     * The number of columns in the grid
     * @type Number
     */
    this.xSize = 0;
    /**
     * The number of rows in the grid
     * @type Number
     */
    this.ySize = 0;
    /**
     * A function to map date objects to a custom timezone
     * @type Function
     */
    this.timezoneMapper = function(date) { 
        if (typeof self.timezoneoffset != "undefined") {
            return date.toTimezone(self.timezoneoffset);
        }
        return date;
    };
    /**
     * A function to map endpoints to an integer x-coordinate
     * @type Function
     */
    this.xMapper = function(obj) { return self.timezoneMapper(obj.time); };
    /**
     * A function to map endpoints to an integer y-coordinate
     * @type Function
     */
    this.yMapper = function(obj) { return self.timezoneMapper(obj.time); };
    /**
     * The height of the horizontal labels in pixels
     * @type Number
     */
    this.xLabelHeight = 24;
    /**
     * The width of the vertical labels in pixels
     * @type Number
     */
    this.yLabelWidth = 48;
    /**
     * The height of the tabs that page between views in pixels
     * @type Number
     */
    this.tabHeight = 18;
};

/**
 * Takes a parameter hash and extends this layout with it, flattening key names
 * to lowercase as it goes.  This is done to eliminate browser-specific
 * attribute case sensitivity.
 *
 * @param {Object} params a parameter hash
 */
Timegrid.Layout.prototype.configure = function(params) {
    for (var attr in params) {
        this[attr] = params[attr.toLowerCase()];
    }
};

/**
 * Computes the grid dimensions (gridheight, gridwidth, ycell, xcell) for this
 * layout.  This is relatively complex since any of the above values can be
 * either user-specified or computed.
 */
Timegrid.Layout.prototype.computeCellSizes = function() {
    // Compute the cell sizes for the grid
    this.xCell = this.params.xCell || this.params.xcell || 100.0 / this.xSize;
    this.yCell = this.params.yCell || this.params.ycell ||
                 (this.gridheight - 1) / this.ySize;
    if (this.params.yCell || this.params.ycell) {
        this.gridheight = this.yCell * this.ySize;
    }
    if (this.params.xCell || this.params.xcell) {
        this.gridwidth = this.xCell * this.xSize;
    }
};

/**
 * Renders out this layout into a DOM object with a wrapping div element as its
 * parent, returning the div.
 *
 * @param {Element} container the parent element
 * @return {Element} a rendered DOM tree descended from a div element
 */
Timegrid.Layout.prototype.render = function(container) {
    if (this.mini) {
        this.scrollwidth = 0;
        this.tabHeight = 0;
        this.xLabelHeight = 24;
        this.yLabelWidth = 24;
    }
    if (!(this.params.height && this.params.gridheight)) {
        this.scrollwidth = 0;
    }
    if (container) {
        this._container = container;
        this._viewDiv = $("<div></div>").addClass('timegrid-view')
                                        .css('top', this.tabHeight + "px");
        $(this._container).append(this._viewDiv);
    } else { 
        this._viewDiv.empty();
    }
    var gridDiv = $('<div></div>').addClass('timegrid-grid');
    var gridWindowDiv = $('<div></div>').addClass('timegrid-grid-window');
    if (!this.scrollwidth) { gridWindowDiv.css('overflow', 'visible'); }
    
    if (!this.params.height) { 
        this.height = this._container.style.height ? 
            $(this._container).height() : 3 + this.scrollwidth + this.tabHeight
                                            + this.xLabelHeight + 
                                              (this.gridheight || 500); 
    }
    $(this._container).height(this.height + "px");
    if (!this.params.width) { 
        this.width = this.params.gridwidth || $(this._container).width(); 
    } else {
        $(this._container).width(this.width + "px");
    }
    $(this._container).css('position', 'relative');
    this._viewDiv.height(this.height - this.tabHeight + "px");

    gridWindowDiv.css("top", this.xLabelHeight).css("left", this.yLabelWidth)
                 .css("right", "0px").css("bottom", "0px");
    this._viewDiv.append(gridWindowDiv.append(gridDiv));
    
    var windowHeight = this._viewDiv.height() - gridWindowDiv.position().top - 2;
    var windowWidth = this._viewDiv.width() - gridWindowDiv.position().left - 2;
    gridWindowDiv.height(windowHeight).width(windowWidth);
    
    this.gridwidth = this.gridwidth || gridWindowDiv.width() - this.scrollwidth;
    this.gridheight = this.gridheight || gridWindowDiv.height() - this.scrollwidth;
    gridDiv.height(this.gridheight + "px").width(this.gridwidth + "px");
    this.computeCellSizes();
    this._gridDiv = gridDiv;
    gridDiv.append(this.renderEvents(document));
    gridDiv.append(this.renderGridlines(document));
    var xLabels = this.renderXLabels();
    var yLabels = this.renderYLabels();
    var syncHorizontalScroll = function(a, b) {
        $(a).scroll(function() { b.scrollLeft = a.scrollLeft; });
        $(b).scroll(function() { a.scrollLeft = b.scrollLeft; });
    };
    var syncVerticalScroll = function(a, b) {
        $(a).scroll(function() { b.scrollTop = a.scrollTop; });
        $(b).scroll(function() { a.scrollTop = b.scrollTop; });
    };
    syncVerticalScroll(yLabels, gridWindowDiv.get(0));
    syncHorizontalScroll(xLabels, gridWindowDiv.get(0));
    this._viewDiv.append(xLabels).append(yLabels);
    
    if (!this.mini) {
        if ($.browser.msie) {
            $('.timegrid-view:visible .timegrid-rounded-shadow', 
              this._container).prettybox(4,0,0,1);
        } else {
            $('.timegrid-view:visible .timegrid-rounded-shadow', 
              this._container).prettybox(4,7,1,0.7);
        }
    }

    return this._viewDiv.get(0);
};

Timegrid.Layout.prototype.renderChanged = function() {
    this.initializeGrid();
    this._gridDiv.empty();
    this._gridDiv.append(this.renderEvents(document));
    this._gridDiv.append(this.renderGridlines(document));
    if (this.renderedStartTime && this.renderedStartTime != this.startTime) {
        this.renderXLabels();
        this.renderYLabels();
    }
    this.renderedStartTime = this.startTime;
    if (!this.mini) {
        if ($.browser.msie) {
            $('.timegrid-view:visible .timegrid-rounded-shadow', 
              this._container).prettybox(4,0,0,1);
        } else {
            $('.timegrid-view:visible .timegrid-rounded-shadow', 
              this._container).prettybox(4,7,1,0.7);
        }
    }
};

/**
 * An abstract method to render events for this layout.  This method is where
 * specific layout implementations hook into the main rendering loop.  While 
 * generally used to render events, this method can return any valid input to
 * the jQuery <code>append</code> method, which is then appended under the grid
 * <code>div</code> element.
 * 
 * @function
 * @param {Document} doc the document to create elements from
 * @return {Content} any valid argument to jQuery's append, to be appended under
 *   the grid <code>div</code>
 */
Timegrid.Layout.prototype.renderEvents = Timegrid.abstract("renderEvents");

/**
 * Renders the gridlines for this layout.  Gridlines are represented in the DOM
 * as absolutely positioned <code>div</code> elements with one dimension set to
 * one pixel.
 *
 * @return {Element} a DOM element containing this layout's gridlines
 */
Timegrid.Layout.prototype.renderGridlines = function() {
    if (this._gridlineContainer) { return this._gridlineContainer; }
    var gridlineContainer = document.createElement("div");
    this._gridlineContainer = gridlineContainer;
    gridlineContainer.className = 'timegrid-gridlines';
    
    for (var x = 0; x < this.xSize; x++) { // Vertical lines
        var vlineDiv = document.createElement('div');
        vlineDiv.className = 'timegrid-vline';
        vlineDiv.style.height = this.gridheight + "px";
        vlineDiv.style.left = x * this.xCell + "%";
        gridlineContainer.appendChild(vlineDiv);
    }
    for (var y = 0; y <= this.ySize; y++) { // Horizontal lines
        var hlineDiv = document.createElement('div');
        hlineDiv.className = 'timegrid-hline';
        hlineDiv.style.width = "100%";
        hlineDiv.style.top = y * this.yCell + "px";
        gridlineContainer.appendChild(hlineDiv);
    }
    return gridlineContainer;
};

/**
 * Renders the horizontal column labels that run above the grid.  The labels 
 * themselves are provided by the implementing layout subclasses by
 * <code>getXLabels()</code>
 *
 * @return {Element} a DOM element containing the horizontal labels
 */
Timegrid.Layout.prototype.renderXLabels = function() {
    this._xLabelContainer = this._xLabelContainer ||
                            document.createElement("div");
    var xLabelContainer = this._xLabelContainer;
    xLabelContainer.innerHTML = "";
    xLabelContainer.className = 'timegrid-xlabels-window';
    xLabelContainer.style.height = this.xLabelHeight + "px";
    xLabelContainer.style.width = this.width - this.yLabelWidth - 
                                  this.scrollwidth - 2 + "px";
    xLabelContainer.style.left = this.yLabelWidth - 1 + "px";
    
    var xLabelsDiv = document.createElement("div");
    xLabelsDiv.className = 'timegrid-xlabels';
    xLabelsDiv.style.height = this.xLabelHeight + "px"
    xLabelsDiv.style.width = this.gridwidth + "px";
    xLabelsDiv.style.top = "0px";
    xLabelContainer.appendChild(xLabelsDiv);
    
    var labels = this.getXLabels();
    for (var i = 0; i < labels.length; i++) {
        var label = document.createElement("div");
        label.className = 'timegrid-label';
        label.innerHTML = labels[i];
        label.style.width = this.xCell + '%';
        label.style.left = (i * this.xCell) + '%';
        xLabelsDiv.appendChild(label);
    }    
    return xLabelContainer;
};

/**
 * Renders the vertical row labels that run along the side of the grid.  The 
 * labels themselves are provided by the implementing layout subclasses by
 * <code>getYLabels()</code>
 *
 * @return {Element} a DOM element containing the vertical labels
 */
Timegrid.Layout.prototype.renderYLabels = function() {
    this._yLabelContainer = this._yLabelContainer || 
                            document.createElement("div");
    var yLabelContainer = this._yLabelContainer;
    yLabelContainer.innerHTML = "";
    yLabelContainer.className = 'timegrid-ylabels-window';
    yLabelContainer.style.width = this.yLabelWidth + "px";
    yLabelContainer.style.height = this.height - this.xLabelHeight -
                                   this.scrollwidth - this.tabHeight - 2 + "px";
    yLabelContainer.style.top = this.xLabelHeight - 1 + "px";
    
    var yLabelsDiv = document.createElement("div");
    yLabelsDiv.className = 'timegrid-ylabels';
    yLabelsDiv.style.height = this.gridheight + "px";
    yLabelsDiv.style.width = this.yLabelWidth + "px";
    yLabelsDiv.style.left = "0px";
    yLabelContainer.appendChild(yLabelsDiv);
    
    var labels = this.getYLabels();
    var labelDivs = [];
    for (var i = 0; i < labels.length; i++) {
        var label = document.createElement('div');
        label.className = 'timegrid-label';
        label.innerHTML = labels[i];
        label.style.height = this.yCell + 'px';
        label.style.top = i * this.yCell + 'px';
        
        yLabelsDiv.appendChild(label);
    }
    
    return yLabelContainer;
};

/**
 * An abstract method to get the horizontal column labels for this layout.  This
 * method must be implemented by all layout types subclassing Layout.
 *
 * @function
 * @return {Array} an array of strings to use as column labels
 */
Timegrid.Layout.prototype.getXLabels = Timegrid.abstract("getXLabels");

/**
 * An abstract method to get the vertical row labels for this layout.  This
 * method must be implemented by all layout types subclassing Layout.
 *
 * @function
 * @return {Array} an array of strings to use as row labels
 */
Timegrid.Layout.prototype.getYLabels = Timegrid.abstract("getYLabels");
/**
 * NMonthLayout
 * @fileoverview
 *   This is where the monthly layout is defined.  The layout is designed to 
 *   resemble the equivalent Google Calendar view.
 * @author masont
 */

Timegrid.NMonthLayout = function(eventSource, params) {
    Timegrid.NMonthLayout.superclass.call(this, eventSource, params);
    var self = this;

    this.xSize = 7;
    this.ySize = 0; // This is re-calculated later based on n
    this.n     = 3;
    this.iterable = true;

    this.configure(params);
    // We put title here because it depends on this.n
    this.title = this.title || Timegrid.NMonthLayout.l10n.makeTitle(this.n);
    
    // Initialize our eventSource
    this.eventSource   = eventSource;

    // Configure our mappers
    this.xMapper = function(obj) {
        return self.timezoneMapper(obj.time).getDay();
    };
    this.yMapper = function(obj) { 
        var time = self.timezoneMapper(obj.time);
        var start = self.timezoneMapper(self.startTime);
        // Simply divide by the number of milliseconds in a week
        return Math.floor((time - start) / (1000 * 60 * 60 * 24 * 7.0));
    };
    
    this.initializeGrid();
};
Timegrid.LayoutFactory.registerLayout("n-month", Timegrid.NMonthLayout);

Timegrid.NMonthLayout.prototype.initializeGrid = function() {
    this.startTime     = this.eventSource.getEarliestDate() || new Date();
    this.dataStartTime = new Date(this.eventSource.getEarliestDate()) ||
                         new Date();
    this.updateGrid();
};
Timegrid.NMonthLayout.prototype.updateGrid = function() {
    this.computeDimensions();
    var now = new Date();
    if (now.isBetween(this.startTime, this.endTime)) { this.now = now; }
    this.eventGrid = new Timegrid.Grid([], this.xSize, this.ySize, 
                                       this.xMapper, this.yMapper);
    if (this.startTime) {
        var iterator = this.eventSource.getEventIterator(this.startTime,
                                                         this.endTime);
        while (iterator.hasNext()) {
            var endpoints = Timegrid.NMonthLayout.getEndpoints(iterator.next());
            this.eventGrid.addAll(endpoints);
        }
    }
};

Timegrid.NMonthLayout.prototype.computeDimensions = function() {
    this.startTime = this.computeStartTime(this.startTime);
    
    // Use a method to compute cell and y-labels (non-trivial).  This method
    // will also compute ySize based on n, an unfortunate grouping.
    this.computeYSize(this.startTime);
    this.computeLabels(this.startTime);

    this.endTime = this.computeEndTime(this.startTime);
    
    // Compute the cell sizes for the grid
    this.computeCellSizes();
};

Timegrid.NMonthLayout.prototype.renderEvents = function(doc) {
    var eventContainer = doc.createElement("div");
    var labelContainer = doc.createElement("div");
    var colorContainer = doc.createElement("div");
    $(eventContainer).addClass("timegrid-events");
    $(labelContainer).addClass("timegrid-month-labels");
    $(colorContainer).addClass("timegrid-month-colors");
    var i = 0;
    var dates = this.cellLabels;
    for (y = 0; y < this.ySize; y++) {
        for (x = 0; x < this.xSize; x++) {
            var endpoints = this.eventGrid.get(x,y);
            var events = $.map(endpoints, function(e) { 
                return e.type == "start" ? e.event : null;
            });
            var n = dates[i];
            var m = this.months[i];
            eventContainer.appendChild(this.renderEventList(events, x, y,
                                                                    n, m));
            colorContainer.appendChild(this.renderCellColor(x, y, m));
            i++;
        }
    }
    $(labelContainer).append($(this.renderMonthLabels()));
    return $([eventContainer, labelContainer, colorContainer]);
};

Timegrid.NMonthLayout.prototype.renderEventList = function(evts, x, y, n, m) {
    var jediv = $("<div></div>").addClass("timegrid-month-cell");
    var eList = $("<ul></ul>").addClass("timegrid-event-list");
    for (var i = 0; i < evts.length; i++) {
        eList.append('<li>' + evts[i].getText() + '</li>');
    }
    jediv.append(eList);
    jediv.append('<span class="timegrid-month-date-label">' + n + '</span>');
    jediv.css("height", this.yCell).css("width", this.xCell + "%");
    jediv.css("top", this.yCell * y);
    jediv.css("left", this.xCell * x + '%');
    return jediv.get()[0]; // Return the actual DOM element
};

Timegrid.NMonthLayout.prototype.renderCellColor = function(x, y, m) {
    var jcdiv = $("<div></div>").addClass("timegrid-month-cell");
    jcdiv.addClass("timegrid-month-cell-" + (m % 2 ? "odd" : "even"));
    jcdiv.css("height", this.yCell).css("width", this.xCell + "%");
    jcdiv.css("top", this.yCell * y);
    jcdiv.css("left", this.xCell * x + "%");
    
    if (this.now) {
        var nowX = this.xMapper({ time: this.now });
        var nowY = this.yMapper({ time: this.now });
        if (x == nowX && y == nowY) { 
            jcdiv.addClass("timegrid-month-cell-now"); 
        }
    }
    
    return jcdiv.get()[0];

};

Timegrid.NMonthLayout.prototype.renderMonthLabels = function() {
    var self = this;
    return $.map(this.monthStarts, function(monthStart) {
        var monthString = monthStart.date.getMonthName();
        var mDiv = $('<div><span>' + monthString + '</span></div>');
        mDiv.addClass('timegrid-month-label');
        mDiv.css('top', self.yCell * monthStart.i + "px");
        var height = monthStart.height * self.yCell;
        mDiv.height(height + "px");
        mDiv.children().css('line-height', height + "px");
        return mDiv.get(0);
    });
};

Timegrid.NMonthLayout.prototype.highlightNow = function() {
    var now = new Date();
    var x = this.xMapper({ time: now });
    var y = this.yMapper({ time: now });
};

Timegrid.NMonthLayout.prototype.getXLabels = function() {
    return Date.l10n.dayNames;
};

Timegrid.NMonthLayout.prototype.getYLabels = function() {
    return this.yLabels;
};

Timegrid.NMonthLayout.prototype.goPrevious = function() {
    this.dataStartTime.add('M', 0 - this.n);
    this.startTime = new Date(this.dataStartTime);
    this.updateGrid();
    this.render();
};

Timegrid.NMonthLayout.prototype.goNext = function() {
    this.dataStartTime.add('M', this.n);
    this.startTime = new Date(this.dataStartTime);
    this.updateGrid();
    this.render();
};

Timegrid.NMonthLayout.prototype.getCurrent = function() {
    var start = this.monthStarts[0].date;
    var end   = this.monthStarts[this.monthStarts.length - 1].date;
    if (this.n > 1) {
        return Timegrid.NMonthLayout.l10n.makeRange(start, end);
    } else {
        return Timegrid.NMonthLayout.l10n.makeRange(start);
    }
};

Timegrid.NMonthLayout.prototype.computeStartTime = function(date) {
    if (date) {
        var startTime = new Date(date);
        startTime.setDate(1);
        startTime.setHours(0);
        // Roll back to the first day on the grid
        while (this.xMapper({ time: startTime }) > 0) {
            startTime.setHours(-24);
        }
        return startTime;
    }
};

Timegrid.NMonthLayout.prototype.computeEndTime = function(date) {
    if (date) {
        var endTime = new Date(date);
        endTime.add('d', this.ySize * 7);
        return endTime;
    }
    return false;
};

Timegrid.NMonthLayout.prototype.computeYSize = function(date) {
    var gridStart = { time: new Date(date) };
    var month = this.dataStartTime.getMonth();
    this.ySize = 0;
    this.monthStarts = [{ i: this.ySize, date: new Date(this.dataStartTime) }]; 
    while (this.xMapper(gridStart) > 0 && this.yMapper(gridStart) >= 0) {
        gridStart.time.setHours(-24);
    }
    gridStart.time.add('d', 7);
    for (; this.monthStarts.length <= this.n; gridStart.time.add('d', 7)) {
        if (gridStart.time.getMonth() != month) { 
            month = gridStart.time.getMonth();
            var year = gridStart.time.getFullYear();
            this.monthStarts.push({i: this.ySize, date: new Date(gridStart.time)});
            var old = this.monthStarts[this.monthStarts.length - 2];
            old.height = this.ySize - old.i + 1;
        }
        this.ySize++;
    }
    this.monthStarts.pop();
};

Timegrid.NMonthLayout.prototype.computeLabels = function(date) {
    var gridStart = { time: new Date(date) };
    this.cellLabels = [];
    this.months = [];
    this.yLabels = [];

    // Iterate through and collect the tasty data
    while (this.xMapper(gridStart) < this.xSize && 
           this.yMapper(gridStart) < this.ySize) {
        var d = gridStart.time;
        this.cellLabels.push(d.getDate());
        this.months.push(d.getMonth());
        if (d.getDay() == 0) { 
            this.yLabels.push(d.format(Timegrid.NMonthLayout.l10n.yLabelFormat)); 
        }
        d.setHours(24);
    }
};

Timegrid.NMonthLayout.getEndpoints = function(evt) {
    return [ { type: "start",
               time: evt.getStart(),
               event: evt },
             { type: "end",
               time: evt.getEnd(),
               event: evt } ];
};
/******************************************************************************
 * MonthLayout
 * @fileoverview
 *   This is where the monthly layout is defined.  The layout is designed to 
 *   resemble the equivalent Google Calendar view.
 * @author masont
 *****************************************************************************/

Timegrid.MonthLayout = function(eventSource, params) {
    params.n = 1;
    params.title = params.title || Timegrid.MonthLayout.l10n.makeTitle();
    Timegrid.MonthLayout.superclass.call(this, eventSource, params);
};
Timegrid.LayoutFactory.registerLayout("month", Timegrid.MonthLayout);
$.inherit(Timegrid.MonthLayout, Timegrid.NMonthLayout);

/******************************************************************************
 * NDayLayout
 * @fileoverview
 *   This is where the n-day layout is defined.  The layout is designed to 
 *   resemble the equivalent Google Calendar view.
 * @author masont
 *****************************************************************************/
console.log("== NDayLayout.js =="); 
 /**
  * Constructs an NDayLayout object.
  * @class NDayLayout is a subclass of Layout that implements an n-day event
  *   calendar, modeled off of the weekly view found in Google Calendar.
  * @extends Timegrid.Layout
  * @constructor
  */
Timegrid.NDayLayout = function(eventSource, params) {
    Timegrid.NDayLayout.superclass.call(this, eventSource, params);
    var self = this;
    
    // Specifications for a week layout
    this.xSize = 7;
    this.ySize = 24;
    this.iterable = true;
        
    // These are default values that can be overridden in configure
    this.n = 3;

    this.xMapper = function(obj) { 
        var time = self.timezoneMapper(obj.time);
        var start = self.timezoneMapper(self.startTime);
        var ivl = new SimileAjax.DateTime.Interval(time - start); 
        return ivl.days; 
    };
    this.yMapper = function(obj) { 
        var time = self.timezoneMapper(obj.time);
        return (time.getHours() + time.getMinutes() / 60.0) - self.dayStart;
    };
    
    this.configure(params);
    
    this.title = params.title || Timegrid.NDayLayout.l10n.makeTitle(this.n);
    this.xSize = this.n;
    this.dayEnd = this.dayend || 24;
    this.dayStart = this.daystart || 0;
    this.ySize  = this.dayEnd - this.dayStart;
    this.computeCellSizes();
    
    this.eventSource = eventSource;
    this.initializeGrid(eventSource);
};
Timegrid.LayoutFactory.registerLayout("n-day", Timegrid.NDayLayout);

Timegrid.NDayLayout.prototype.initializeGrid = function() {
    this.startTime = this.computeStartTime();
    this.startTime.setHours(0);
    this.endTime = this.computeEndTime(this.startTime); 
    
    this.updateGrid();
};

Timegrid.NDayLayout.prototype.updateGrid = function() {
    var now = new Date();
    if (now.isBetween(this.startTime, this.endTime)) { this.now = now; }
    
    this.endpoints = [];
    if (this.startTime) {
        var iterator = this.eventSource.getEventIterator(this.startTime,
                                                         this.endTime);
        while (iterator.hasNext()) {
            var ends = Timegrid.NDayLayout.getEndpoints(iterator.next());
            this.endpoints.push(ends[0]);
            this.endpoints.push(ends[1]);
        }
    }
    this.endpoints.sort(function(a, b) { 
        var diff = a.time - b.time;
        if (!diff) {
            return a.type == "start" ? 1 : -1;
        } else {
            return diff;
        }
    });
};

Timegrid.NDayLayout.prototype.renderEvents = function(doc) {
    var eventContainer = doc.createElement("div");
    $(eventContainer).addClass("timegrid-events");
    var currentEvents = {};
    var currentCount = 0;
    for (var i = 0; i < this.endpoints.length; i++) {
        var endpoint = this.endpoints[i];
        var x = this.xMapper(endpoint);
        var y = this.yMapper(endpoint);
        if (endpoint.type == "start") {
            // Render the event
            var eventDiv = this.renderEvent(endpoint.event, x, y);
            eventContainer.appendChild(eventDiv);
            // Push the event div onto the current events set
            currentEvents[endpoint.event.getID()] = eventDiv;
            currentCount++;
            // Adjust widths and offsets as necessary
            var hIndex = 0;
            for (var id in currentEvents) {
                var eDiv = currentEvents[id];
                var newWidth = this.xCell / currentCount;
                var newLeft = this.xCell * x + newWidth * hIndex;
                $(eDiv).css("width", newWidth + "%");
                $(eDiv).css("left", newLeft + "%");
                hIndex++;
            }
        } else if (endpoint.type == "end") {
            // Pop event from current events set
            delete currentEvents[endpoint.event.getID()];
            currentCount--;
        }
    }
    var nowDiv = this.renderNow();
    if (nowDiv) { 
        return $([eventContainer, nowDiv]); 
    } else {
        return eventContainer;
    }
};

Timegrid.NDayLayout.prototype.renderEvent = function(evt, x, y) {
    var ediv = document.createElement('div');
    var tediv = document.createElement('div');
    if (!this.mini) { tediv.innerHTML = evt.getText(); }
    ediv.appendChild(tediv);
    var length = (evt.getEnd() - evt.getStart()) / (1000 * 60 * 60.0);
    var className = "timegrid-event";
    if (!this.mini) {
       className += ' timegrid-rounded-shadow';
    }
    ediv.className = className;
    ediv.style.height = this.yCell * length + "px";
    ediv.style.top = this.yCell * y + "px";
    ediv.style.left = this.xCell * x + '%';
    if (evt.getColor()) { ediv.style.backgroundColor = evt.getColor(); }
    if (evt.getTextColor()) { ediv.style.color = evt.getTextColor(); }
    return ediv; // Return the actual DOM element
};

Timegrid.NDayLayout.prototype.renderNow = function() {
    // If we aren't looking at the current time, return
    if (!this.now) { return; }
    
    var nowX = this.xMapper({ time: this.now });
    var nowY = Math.floor(this.yMapper({ time: this.now }));
    
    var rectDiv = $('<div></div>').addClass('timegrid-week-highlights');
    var yRect = $('<div></div>').height(this.yCell + "px")
                                .width(this.xCell * this.xSize + "%")
                                .css('top', nowY * this.yCell + "px")
                                .addClass('timegrid-week-highlight');
    var xRect = $('<div></div>').height(this.yCell * this.ySize + "px")
                                .width(this.xCell + "%")
                                .css('left', nowX * this.xCell + "%")
                                .addClass('timegrid-week-highlight');
    rectDiv.append(xRect).append(yRect);
    return rectDiv.get(0);
};

Timegrid.NDayLayout.prototype.getXLabels = function() {
    var date = new Date(this.startTime);
    var labels = [];
    var format = this.mini ? Timegrid.NDayLayout.l10n.mini.xLabelFormat :
                             Timegrid.NDayLayout.l10n.xLabelFormat;
    while (date < this.endTime) {
        labels.push(date.format(format));
        date.setHours(24);
    }
    return labels;
};

Timegrid.NDayLayout.prototype.getYLabels = function() {
    var date = (new Date()).clearTime();
    var labels = [];
    var format = this.mini ? Timegrid.NDayLayout.l10n.mini.yLabelFormat :
                             Timegrid.NDayLayout.l10n.yLabelFormat;
    for (var i = +this.dayStart; i < +this.dayEnd; i++) {
        date.setHours(i);
        labels.push(date.format(format));
    }
    return labels;
};

Timegrid.NDayLayout.prototype.goPrevious = function() {
    this.endTime = this.startTime;
    this.startTime = this.computeStartTime(this.endTime);
    this.updateGrid();
    this.render();
};

Timegrid.NDayLayout.prototype.goNext = function() {
    this.startTime = this.endTime;
    this.endTime = this.computeEndTime(this.startTime);
    this.updateGrid();
    this.render();
};

Timegrid.NDayLayout.prototype.getCurrent = function() {
    this.endTime.add('s', -1);
    var result = Timegrid.NDayLayout.l10n.makeRange(this.startTime,
                                                    this.endTime);
    this.endTime.add('s', 1);
    return result;
};

Timegrid.NDayLayout.prototype.computeStartTime = function(date) {
    if (date) {
        var startTime = new Date(date);
        startTime.add('d', 0 - this.n);
        startTime.setHours(0);
        return startTime;
    } else {
        var startTime = new Date(this.eventSource.getEarliestDate()) ||
                        new Date();
        startTime.clearTime();
        return startTime;
    }
};

Timegrid.NDayLayout.prototype.computeEndTime = function(date) {
    if (date) {
        var endTime = new Date(date);
        endTime.add('d', this.n);
        endTime.setHours(0);
        return endTime;
    }
    return false;
};

Timegrid.NDayLayout.getEndpoints = function(evt) {
    return [ { type: "start",
               time: evt.getStart(),
               event: evt },
             { type: "end",
               time: evt.getEnd(),
               event: evt } ];
};
/******************************************************************************
 * WeekLayout
 * @fileoverview
 *   This is where the weekly layout is defined.  The layout is designed to 
 *   resemble the equivalent Google Calendar view.
 * @author masont
 *****************************************************************************/
 
 /**
  * Constructs a WeekLayout object.
  * @class WeekLayout is a subclass of Layout that implements a weekly event
  *     calendar, modeled off of the weekly view found in Google Calendar.
  * @extends Timegrid.Layout
  * @constructor
  */
Timegrid.WeekLayout = function(eventSource, params) {
    params.n = 7;
    params.title = params.title || Timegrid.WeekLayout.l10n.makeTitle();
    Timegrid.WeekLayout.superclass.call(this, eventSource, params);
};
Timegrid.LayoutFactory.registerLayout("week", Timegrid.WeekLayout);
$.inherit(Timegrid.WeekLayout, Timegrid.NDayLayout);

Timegrid.WeekLayout.prototype.computeStartTime = function(date) {
    if (date) {
        // We don't need to make sure it's the start of the week, once it's
        // been set properly already.
        var startTime = new Date(date);
        startTime.add('d', 0 - this.n);
        return startTime;
    } else {
        var startTime = new Date(this.eventSource.getEarliestDate()) ||
                        new Date();
        var newStartTime = new Date(startTime);
        newStartTime.clearTime().setDay(Date.l10n.firstDayOfWeek);
        return newStartTime > startTime ? this.computeStartTime(newStartTime) :
                                          newStartTime;
    }
};
console.log("== property.js ==");
/**
 * @name Timegrid.PropertyLayout
 * @author masont
 */

/**
 * PropertyLayout is a subclass of Layout that provides Timegrid with layouts
 * that place events into rows and columns based on arbitrary properties, in
 * addition to temporal values (hour, day, week, etc.).
 *
 * @constructor
 */
Timegrid.PropertyLayout = function(eventSource, params) {
    Timegrid.PropertyLayout.superclass.call(this, eventSource, params);
    var self = this;
    
    this.xSize = 0;
    this.ySize = 0;
    this.iterable = false;
    this.title = Timegrid.PropertyLayout.l10n.makeTitle();
    this.property = "title";

    this.xMapper = function(obj) {
        return self.values.indexOf(obj.event.getProperty(self.property));
    };
    this.yMapper = function(obj) { 
        var time = self.timezoneMapper(obj.time);
        return (time.getHours() + time.getMinutes() / 60.0) - self.dayStart;
    };

    this.configure(params);

    this.dayEnd = this.dayend || 24;
    this.dayStart = this.daystart || 0;
    this.ySize  = this.dayEnd - this.dayStart;    

    this.eventSource = eventSource;
    this.initializeGrid();
};
Timegrid.LayoutFactory.registerLayout("property", Timegrid.PropertyLayout);

Timegrid.PropertyLayout.prototype.initializeGrid = function() {
    this.startTime   = new Date(this.eventSource.getEarliestDate()) || new Date();
    this.endTime     = new Date(this.eventSource.getLatestDate()) || new Date();
    this.values      = new DStructs.Array();
    this.updateGrid();
};

Timegrid.PropertyLayout.prototype.updateGrid = function() {
    this.computeDimensions();
    this.eventGrid = new Timegrid.Grid([], this.xSize, this.ySize,
                                       this.xMapper, this.yMapper);
    if (this.startTime) {
        var iterator = this.eventSource.getEventIterator(this.startTime,
                                                         this.endTime);
        while (iterator.hasNext()) {
            var eps = Timegrid.PropertyLayout.getEndpoints(iterator.next());
            this.eventGrid.addAll(eps);
        }
    }
};

Timegrid.PropertyLayout.prototype.computeDimensions = function() {
    var iterator = this.eventSource.getEventIterator(this.startTime,
                                                     this.endTime);
    this.values.clear();
    while (iterator.hasNext()) {
        this.values.push(iterator.next().getProperty(this.property));
    }
    this.values = this.values.uniq();
    this.xSize = this.values.length;
};

Timegrid.PropertyLayout.prototype.renderEvents = function(doc) {
    var eventContainer = doc.createElement("div");
    $(eventContainer).addClass("timegrid-events");
    var currentEvents = {};
    var currentCount = 0;
    for (x = 0; x < this.xSize; x++) {
        for (y = 0; y < this.ySize; y++) {
            var endpoints = this.eventGrid.get(x,y).sort(function(a, b) {
                return a.time - b.time;
            });
            for (var i = 0; i < endpoints.length; i++) {
                var endpoint = endpoints[i];
                if (endpoint.type == "start") {
                    // Render the event
                    var eventDiv = this.renderEvent(endpoint.event, x, y);
                    eventContainer.appendChild(eventDiv);
                    // Push the event div onto the current events set
                    currentEvents[endpoint.event.getID()] = eventDiv;
                    currentCount++;
                    // Adjust widths and offsets as necessary
                    var hIndex = 0;
                    for (id in currentEvents) {
                        var eDiv = currentEvents[id];
                        var newWidth = this.xCell / currentCount;
                        $(eDiv).css("width", newWidth + "%");
                        $(eDiv).css("left", this.xCell * x + newWidth * hIndex + "%");
                        hIndex++;
                    }
                } else if (endpoint.type == "end") {
                    // Pop event from current events set
                    delete currentEvents[endpoint.event.getID()];
                    currentCount--;
                }
            }
        }
    }
    return eventContainer;
};

Timegrid.PropertyLayout.prototype.renderEvent = function(evt, x, y) {
    var jediv = this.mini ? $("<div><div></div></div>") : 
                            $("<div><div>" + evt.getText() + "</div></div>");
    var length = (evt.getEnd() - evt.getStart()) / (1000 * 60 * 60.0);
    jediv.addClass("timegrid-event");
    if (!this.mini) {
        jediv.addClass('timegrid-rounded-shadow');
    }
    jediv.css("height", this.yCell * length);
    jediv.css("top", this.yCell * y);
    jediv.css("left", this.xCell * x + '%');
    if (evt.getColor()) { jediv.css('background-color', evt.getColor()); }
    if (evt.getTextColor()) { jediv.css('color', evt.getTextColor()); }
    return jediv.get()[0]; // Return the actual DOM element
};

Timegrid.PropertyLayout.prototype.getXLabels = function() {
    return this.values;
};

Timegrid.PropertyLayout.prototype.getYLabels = function() {
    var date = (new Date()).clearTime();
    var labels = [];
    for (var i = +this.dayStart; i < +this.dayEnd; i++) {
        date.setHours(i);
        labels.push(date.format(Timegrid.PropertyLayout.l10n.yLabelFormat));
    }
    return labels;
};

Timegrid.PropertyLayout.getEndpoints = function(evt) {
    return [ { type: "start",
               time: evt.getStart(),
               event: evt },
             { type: "end",
               time: evt.getEnd(),
               event: evt } ];
};
console.log("== locale.js ==");
/******************************************************************************
 *  Timegrid English localization
 *****************************************************************************/
 
if (!("l10n" in Timegrid)) {
    Timegrid.l10n = {};
}

Timegrid.l10n.loadingMessage = "Loading...";

Timegrid.l10n.jsonErrorMessage = "Failed to load JSON data from";

Timegrid.l10n.xmlErrorMessage = "Failed to load XML data from";
/******************************************************************************
 *  Timegrid Date English localization
 *****************************************************************************/

if (!("l10n" in Date)) {
    Date.l10n = {};
}
 
/** Full month names. Change this for local month names */
Date.l10n.monthNames =[ 'January','February','March','April','May','June','July','August','September','October','November','December'];

/** Month abbreviations. Change this for local month names */
Date.l10n.monthAbbreviations = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Full day names. Change this for local month names */
Date.l10n.dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/** Day abbreviations. Change this for local month names */
Date.l10n.dayAbbreviations = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/**
 * Used for parsing ambiguous dates like 1/2/2000 - default to preferring
 * 'American' format meaning Jan 2. Set to false to prefer 'European' format 
 * meaning Feb 1.
 */
Date.l10n.preferAmericanFormat = true;

/** Used to specify which day the week starts on, 0 meaning Sunday, etc. */
Date.l10n.firstDayOfWeek = 0;
/******************************************************************************
 *  Timegrid NMonthLayout English localization
 *****************************************************************************/
 
if (!("l10n" in Timegrid.NMonthLayout)) {
    Timegrid.NMonthLayout.l10n = {};
}

/** Function to create a title string from an n-value */
Timegrid.NMonthLayout.l10n.makeTitle = function(n) { return n + "-Month"; }

/** Function to combine two dates into a string describing the grid's range */
Timegrid.NMonthLayout.l10n.makeRange = function(d1, d2) {
    var string = d1.format(Timegrid.NMonthLayout.l10n.startFormat);
    if (d2) {
        string +=  " - " + d2.format(Timegrid.NMonthLayout.l10n.endFormat);
    }
    return string;
};

/** Format not needed, localized day names are in Timegrid.l10n.dayNames */
Timegrid.NMonthLayout.l10n.xLabelFormat = "";

/** Format for vertical "W23" style labels */
Timegrid.NMonthLayout.l10n.yLabelFormat = "Ww";

/** Format for displaying the grid's starting date, e.g. "6/12/2007" */
Timegrid.NMonthLayout.l10n.startFormat = "MMM yyyy";

/** Format for displaying the grid's ending date, e.g. "6/15/2007" */
Timegrid.NMonthLayout.l10n.endFormat = "MMM yyyy";
/******************************************************************************
 *  Timegrid MonthLayout English localization
 *****************************************************************************/
 
if (!("l10n" in Timegrid.MonthLayout)) {
    Timegrid.MonthLayout.l10n = {};
}

/** Function to create a title string */
Timegrid.MonthLayout.l10n.makeTitle = function(n) { return "Month"; }
/******************************************************************************
 *  Timegrid NDayLayout English localization
 *****************************************************************************/
console.log("== NDay-l10n.js ==");
if (!("l10n" in Timegrid.NDayLayout)) {
    Timegrid.NDayLayout.l10n = { mini: {} };
}
 
/** Function to create a title string from an n-value */
Timegrid.NDayLayout.l10n.makeTitle = function(n) { return n + "-Day"; }

/** Function to combine two dates into a string describing the grid's range */
Timegrid.NDayLayout.l10n.makeRange = function(d1, d2) {
    return d1.format(Timegrid.NDayLayout.l10n.startFormat) + " - " +
           d2.format(Timegrid.NDayLayout.l10n.endFormat);
};

/** Format for horizontal "Mon 5/24" style labels */
Timegrid.NDayLayout.l10n.xLabelFormat = "E M/d";
Timegrid.NDayLayout.l10n.mini.xLabelFormat = "e";

/** Format for vertical "12am" style labels */
Timegrid.NDayLayout.l10n.yLabelFormat = "ha";
Timegrid.NDayLayout.l10n.mini.yLabelFormat = "h";

/** Format for displaying the grid's starting date, e.g. "6/12/2007" */
Timegrid.NDayLayout.l10n.startFormat = "M/d/yyyy";

/** Format for displaying the grid's ending date, e.g. "6/15/2007" */
Timegrid.NDayLayout.l10n.endFormat = "M/d/yyyy";
/******************************************************************************
 *  Timegrid WeekLayout English localization
 *****************************************************************************/
 
if (!("l10n" in Timegrid.WeekLayout)) {
    Timegrid.WeekLayout.l10n = {};
}

/** Function to create a title string */
Timegrid.WeekLayout.l10n.makeTitle = function(n) { return "Week"; }
/******************************************************************************
 *  Timegrid PropertyLayout English localization
 *****************************************************************************/

if (!("l10n" in Timegrid.PropertyLayout)) {
    Timegrid.PropertyLayout.l10n = {};
}

/** Function to create a title string */
Timegrid.PropertyLayout.l10n.makeTitle = function() { return "Property"; }

/** Format for vertical "12am" style labels */
Timegrid.PropertyLayout.l10n.yLabelFormat = "ha";


