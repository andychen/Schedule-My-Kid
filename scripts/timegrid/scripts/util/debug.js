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

