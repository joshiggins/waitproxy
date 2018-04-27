# waitproxy

waitproxy is a reverse HTTP proxy written in Nodejs.

When a request is made, it determines if the target is available. If the target is unavailable, it triggers a mechanism in order to make it available (such as sending a Wake-On-Lan packet) and then waits for the target to become available, eventually fulfilling the request.

It displays an interim page which refreshes automatically so that the user knows something is happening.