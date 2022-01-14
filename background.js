let base = []

chrome.runtime.onMessage.addListener(
    function(message, sender, callback) {
        if (message.type == 'loadInfo') {
            console.log(message)
			$.ajax({
                type: 'GET',
                url: `https://moonrank.app/mints/${message.short_name}`,
                success: function(body) {
                    base = body;
                    callback(body);
                },
                error: function(err) {
                    callback({
						success: false
					});
                }
            });
            return true;
        } else {
            callback({
                success: false
            });
        }
    }
);