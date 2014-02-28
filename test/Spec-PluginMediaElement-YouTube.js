describe('YouTube plugin', function() {
	var MAX_WAIT = 5000;

	var element = null;
	var domElem = null;

	beforeEach(function() {
		$('body').append('<video width="640" height="480" id="player1"' +
			'<source type="video/youtube" src="https://www.youtube.com/watch?v=yyWWXSwtPP0"></source>' +
			'</video>');
		player = new MediaElementPlayer('#player1', {
			protocol: 'https://',
			plugins: ['youtube'],
			features: ['playpause', 'progress', 'current'],
			youTubeIframeFirst: true,
			success: function(mediaElement, domObject) {
				element = mediaElement;
				domElem = domObject;
			}
		});
		waitsFor(function() {
			return element !== null;
		}, "MediaElement should have loaded", MAX_WAIT);
	});

	afterEach(function() {
		player.remove();
		
		domElem = $('#player1')[0];
		domElem.parentNode.removeChild(domElem);		

		player = element = domElem = null;
	})

	it("has correct state before playback begins", function() {
		expect(player.media.paused).toBe(true);
		expect(player.media.ended).toBe(false);
		expect(player.media.readyState).toBe(player.media.HAVE_NOTHING);
	});

	it("has correct state after 'playing'", function() {
		var playing = false;

		runs(function() {
			player.media.addEventListener('playing', function() {
				playing = true;
			})

			player.play();
		});

		waitsFor(function() {
			return playing === true;
		}, MAX_WAIT);

		runs(function() {
			expect(player.media.paused).toBe(false);
			expect(player.media.ended).toBe(false);
			expect(player.media.readyState).toBe(player.media.HAVE_FUTURE_DATA);
		});
	});
	
	it("has correct state on 'pause' after playback starts", function() {
		var paused = false;

		runs(function() {
			player.media.addEventListener('pause', function() {
				paused = true;
			})

			player.play();
			player.pause();
		});

		waitsFor(function() {
			return paused === true;
		}, MAX_WAIT);

		runs(function() {
			expect(player.media.paused).toBe(true);
			expect(player.media.ended).toBe(false);
		});
	});

	it("has correct state after 'ended'", function() {
		var ended = false;

		runs(function() {
			player.media.addEventListener('ended', function() {
				ended = true;
			});
			player.setCurrentTime(player.media.duration-1);
		});

		waitsFor(function() {
			return ended === true;
		}, MAX_WAIT);

		runs(function() {
			expect(player.media.paused).toBe(false);
			expect(player.media.ended).toBe(true);
		});
	});

	it("fires 'loadedmetdata', 'play', 'playing' when playback starts for the first time", function() {
		var callback = jasmine.createSpy('callback object');

		runs(function() {
			player.media.addEventListener('loadedmetadata', callback);
			player.media.addEventListener('playing', callback);
			player.media.addEventListener('play', callback);

			player.play();
		});

		waitsFor(function() {
			return player.media.paused === false;
		}, MAX_WAIT);

		runs(function() {
			expect(callback.calls.length).toBe(3);
			expect(callback.calls[0].args[0].type).toBe('loadedmetadata');
			expect(callback.calls[1].args[0].type).toBe('play');
			expect(callback.calls[2].args[0].type).toBe('playing');
		});
	});

	it("has correct `readyState` when 'loadedmetadata' event fires", function() {
		var finished = false;

		var callback = function() {
			expect(player.media.readyState).toBe(player.media.HAVE_METADATA);
			finished = true;
		}

		runs(function() {
			player.media.addEventListener('loadedmetadata', callback)
			player.play();
		});

		waitsFor(function() {
			return finished === false;
		}, MAX_WAIT);
	});

	// cheat a bit and simulate buffering state -- not a real integration test

	it("has correct state when 'buffering' starts during playback", function() {
		player.media.paused = false;
		mejs.YouTubeApi.handleStateChange(3, player, player.media);

		expect(player.media.readyState).toBe(player.media.HAVE_CURRENT_DATA);
	});

	it("fires 'waiting' event when buffering only if playing", function() {
		var callback = jasmine.createSpy('waiting callback');
		player.media.addEventListener('waiting', callback);

		mejs.YouTubeApi.handleStateChange(3, player, player.media);
		expect(callback).not.toHaveBeenCalled();

		player.media.paused = false;

		mejs.YouTubeApi.handleStateChange(3, player, player.media);
		expect(callback).toHaveBeenCalled();
	});

	it("playing gets a 'timeupdate'", function() {
		var gotUpdate = false;

		runs(function() {
			expect(player.media.currentTime).toBe(0);
			
			player.media.addEventListener('timeupdate', function() {
				gotUpdate = true;
			});

			player.play();
		});

		waitsFor(function() {
			return gotUpdate === true;
		}, MAX_WAIT);

		runs(function() {
			expect(player.media.currentTime).toBeGreaterThan(0);
		});
	});

	it("`currentTime` is correct on first 'timeupdate' after seeking", function() {
		var gotUpdate = false;

		runs(function() {
			expect(player.media.currentTime).toBe(0);

			player.media.addEventListener('timeupdate', function() {
				gotUpdate = true;
			});

			player.setCurrentTime(2);
		});

		waitsFor(function() {
			return gotUpdate === true;
		}, MAX_WAIT);

		runs(function() {
			expect(player.media.currentTime).toBe(2);
		});
	});

	it("does not get 'timeupdate's when current time is not changing", function() {
		var callback = jasmine.createSpy('timeupdate callback');

		runs(function() {
			player.media.addEventListener('timeupdate', callback);
		});

		var start = (new Date()).getTime();
		waitsFor(function() {
			return (new Date()).getTime() - start > 2000;
		}, MAX_WAIT);

		runs(function() {
			expect(callback.calls.length).toBe(0);
		});
	});

	it("gets multiple 'timeupdate's while playing", function() {
		var playing = false;
		var callback = jasmine.createSpy('timeupdate callback');

		runs(function() {
			player.media.addEventListener('playing', function() {
				playing = true;
			})
			player.media.addEventListener('timeupdate', callback);

			player.play();
		});

		waitsFor(function() {
			return playing === true;
		}, MAX_WAIT);

		var start = (new Date()).getTime();
		waitsFor(function() {
			return (new Date()).getTime() - start > 2000;
		}, MAX_WAIT);

		runs(function() {
			expect(callback.calls.length).toBeGreaterThan(1);
		});
	});
});