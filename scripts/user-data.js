/*
 * scripts/user-data.js
 *
 * @description Related functions to handle user input
 * and persistent data, e.g. ratings and feedback.
 *
 * Includes a star rating plugin script
 */

// holds various dependent functions
userData = {

	// not used outside of this file
	getUserID: function(element) {
		var userID = window.database.getObject('user', 'userid');
		if (userID == null) {
			var href = element.baseURI.replace('http:', 'https:');
			this.setMsg(element, 'Must be logged in to input data. <a href="'
				+ href + '">Login</a>');
		}
		return userID;
	},

	// not used outside of this file
	setMsg: function(element, msg) {
		$(element).parent().parent().find('.message').html(msg);
	},
	
	toggleComments: function(anchor) {
		var userID = this.getUserID($(anchor).children()[0]);
		
		if (userID == null)
			$(anchor).siblings(':not(div.input)').toggle("fast");
		else
			$(anchor).siblings().toggle("fast");
	},
	
	comment: function(button) {
		var classID = button.getAttribute("classid");
		
		var textarea = $(button).parent().find('textarea');
		
		// hide input
		$(button).parent().hide();
		
		var userID = this.getUserID(button);
		if (userID != null) {
			$.post("scripts/post.php",
				{ "userid": userID,
				  "comment": $(textarea).getAttribute('value'),
				  "class": classID
				  },
				function(data){
					userData.setMsg(button, 'Successfully commented: ' + data);
				});
		}
	},
	
	deleteComment: function(anchor) {
		var classID = anchor.getAttribute("classid");
		
		var userID = this.getUserID($(anchor).parent());
		if (userID != null) {
			
			$.post("scripts/post.php",
				{ "userid": userID,
				  "comment": true,
				  "deleteComment": true,
				  "class": classID
				  },
				function(data){
					// hide comment div
					$(anchor).parent().hide();
				});
		}
	},
	
	drain: function(elt) {
		var stars = $(elt).parent().children('.star');
		stars
			.filter('.on').removeClass('on').end()
			.filter('.hover').removeClass('hover').end();
	},
	
	reset: function(value, elt) {
		var siblings = $(elt).parent().children('.star');
		siblings.slice(0, value).addClass('on').end();
	},
	
	starOn: function(star) {
		this.drain(star);
		
		var siblings = $(star).parent().children('.star');
		var index = $(star).children('a').html();
		// fill(this)
		siblings.children('a').css('width', '100%').end();
		siblings.slice(0, index).addClass('hover').end();
	},
	
	starClick: function(star) {
		var userID = userData.getUserID($(star).parent()[0]);
		
		if (userID != null) {
			$(star).parent().attr('curvalue', $(star).children('a').html());
			$.post('./scripts/post.php', {
				'userid': userID,
				'class' : $(star).parent().attr('classid'),
				'rating': $(star).children('a').html()
			});
			
			
			return false;
		}
	},
	
	starOff: function(star) {
		var curValue = $(star).parent().attr('curvalue');
		
		if (curValue != null) {
			this.drain(star);
			this.reset(curValue, star);
		}
	},
	
	cancelOn: function(cancel) {
		this.drain(cancel);
		$(cancel).addClass('on');
	},
	
	cancelClick: function(cancel) {
		this.drain(cancel);
		
		var userID = this.getUserID($(cancel).parent()[0]);
		
		if (userID != null) {
			$(cancel).parent().attr('curvalue', 0);
			$.post('./scripts/post.php', {
				'userid': userID,
				'class' : $(cancel).parent().attr('classid'),
				'rating': '0'
			});
			return false;
		}
	},
	
	cancelOff: function(cancel) {
		var curValue = $(cancel).parent().attr('curvalue');
		this.reset(curValue, cancel);
		
		$(cancel).removeClass('on');
	}

}

