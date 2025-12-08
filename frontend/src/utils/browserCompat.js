// Browser detection and compatibility utilities

/**
 * Detect browser type and version
 */
export function getBrowserInfo() {
	const userAgent = navigator.userAgent.toLowerCase()
	const browser = {
		name: 'unknown',
		version: 'unknown',
		isOldBrowser: false,
		supportsModernJS: true
	}

	// Chrome
	if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edge') === -1) {
		browser.name = 'chrome'
		const match = userAgent.match(/chrome\/(\d+)/)
		if (match) {
			browser.version = parseInt(match[1])
			browser.isOldBrowser = browser.version < 63
		}
	}
	// Firefox
	else if (userAgent.indexOf('firefox') > -1) {
		browser.name = 'firefox'
		const match = userAgent.match(/firefox\/(\d+)/)
		if (match) {
			browser.version = parseInt(match[1])
			browser.isOldBrowser = browser.version < 67
		}
	}
	// Safari
	else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
		browser.name = 'safari'
		const match = userAgent.match(/version\/(\d+)/)
		if (match) {
			browser.version = parseInt(match[1])
			browser.isOldBrowser = browser.version < 12
		}
	}
	// Edge
	else if (userAgent.indexOf('edge') > -1) {
		browser.name = 'edge'
		const match = userAgent.match(/edge\/(\d+)/)
		if (match) {
			browser.version = parseInt(match[1])
			browser.isOldBrowser = browser.version < 79
		}
	}
	// Internet Explorer
	else if (userAgent.indexOf('msie') > -1 || userAgent.indexOf('trident') > -1) {
		browser.name = 'ie'
		browser.isOldBrowser = true
		browser.supportsModernJS = false
	}

	// Check for specific features
	browser.supportsModernJS = !!(
		window.Promise &&
		window.fetch &&
		window.Map &&
		window.Set &&
		Array.prototype.includes
	)

	return browser
}

/**
 * Check if browser needs polyfills or fallbacks
 */
export function needsBrowserFallbacks() {
	const browser = getBrowserInfo()
	return browser.isOldBrowser || !browser.supportsModernJS
}

/**
 * Apply browser-specific fixes
 */
export function applyBrowserFixes() {
	const browser = getBrowserInfo()
	
	// Safari-specific fixes
	if (browser.name === 'safari') {
		// Fix for Safari's back button cache issue
		window.addEventListener('pageshow', (event) => {
			if (event.persisted) {
				window.location.reload()
			}
		})
	}
	
	// Edge-specific fixes
	if (browser.name === 'edge') {
		// Edge sometimes has issues with History API
		if (!window.history.pushState || !window.history.replaceState) {
			console.warn('Edge: History API not fully supported')
		}
	}
	
	// Firefox-specific fixes
	if (browser.name === 'firefox') {
		// Firefox sometimes needs a delay for router navigation
		window.firefoxNavigationDelay = 100
	}
	
	// Old browser warnings
	if (browser.isOldBrowser) {
		console.warn(`Your browser (${browser.name} ${browser.version}) may not fully support this application. Consider upgrading for the best experience.`)
	}
}

/**
 * Get navigation delay for browser compatibility
 */
export function getNavigationDelay() {
	const browser = getBrowserInfo()
	
	if (browser.name === 'firefox' && browser.version < 70) {
		return 100 // Firefox needs a small delay
	}
	
	if (browser.name === 'safari' && browser.version < 13) {
		return 150 // Safari needs a bit more time
	}
	
	if (browser.isOldBrowser) {
		return 200 // Old browsers need more time
	}
	
	return 0 // No delay needed for modern browsers
}

/**
 * Check if browser supports service workers
 */
export function supportsServiceWorker() {
	return 'serviceWorker' in navigator
}

/**
 * Check if browser supports push notifications
 */
export function supportsPushNotifications() {
	return 'PushManager' in window && 'Notification' in window
}

/**
 * Log browser information for debugging
 */
export function logBrowserInfo() {
	const browser = getBrowserInfo()
	console.log('Browser Info:', {
		name: browser.name,
		version: browser.version,
		userAgent: navigator.userAgent,
		isOldBrowser: browser.isOldBrowser,
		supportsModernJS: browser.supportsModernJS,
		supportsServiceWorker: supportsServiceWorker(),
		supportsPushNotifications: supportsPushNotifications(),
		navigationDelay: getNavigationDelay()
	})
}