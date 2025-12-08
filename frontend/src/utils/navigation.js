// Navigation utilities for better browser compatibility
import router from "@/router"
import { getNavigationDelay, needsBrowserFallbacks } from "./browserCompat"

/**
 * Add navigation delay for browser compatibility
 */
function addNavigationDelay(callback, delay = 0) {
	if (delay > 0) {
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				try {
					const result = await callback()
					resolve(result)
				} catch (error) {
					reject(error)
				}
			}, delay)
		})
	} else {
		return callback()
	}
}

/**
 * Safe navigation function that handles browser compatibility issues
 * @param {Object} route - Vue router route object with name, params, query, etc.
 * @param {Object} options - Additional options
 * @param {boolean} options.replace - Use replace instead of push
 * @param {string} options.fallbackUrl - Fallback URL if router navigation fails
 * @returns {Promise}
 */
export async function navigateTo(route, options = {}) {
	const { replace = false, fallbackUrl = null } = options
	const navigationDelay = getNavigationDelay()
	
	try {
		const method = replace ? 'replace' : 'push'
		
		// Validate route object
		if (!route || typeof route !== 'object') {
			throw new Error('Invalid route object')
		}
		
		// Perform navigation with delay if needed
		await addNavigationDelay(async () => {
			return await router[method](route)
		}, navigationDelay)
		
	} catch (error) {
		console.error(`Router ${replace ? 'replace' : 'push'} failed:`, error)
		
		// For old browsers, always use fallback
		if (needsBrowserFallbacks()) {
			console.log('Using fallback navigation for old browser')
			const fallback = fallbackUrl || constructFallbackUrl(route)
			if (fallback) {
				if (replace) {
					window.location.replace(fallback)
				} else {
					window.location.href = fallback
				}
				return
			}
		}
		
		// Fallback 1: Try constructing URL from route
		let fallback = fallbackUrl
		
		if (!fallback && route.name) {
			// Try to construct fallback URL from route
			try {
				const routeRecord = router.resolve(route)
				fallback = routeRecord.href
			} catch (resolveError) {
				console.error('Failed to resolve route:', resolveError)
				fallback = constructFallbackUrl(route)
			}
		}
		
		// Fallback 2: Use window.location
		if (fallback) {
			console.log('Using fallback navigation:', fallback)
			
			if (replace) {
				window.location.replace(fallback)
			} else {
				window.location.href = fallback
			}
		} else {
			throw new Error('Navigation failed and no fallback available')
		}
	}
}

/**
 * Construct fallback URL from route object
 */
function constructFallbackUrl(route) {
	if (!route) return null
	
	// Handle common route patterns
	if (route.name === 'Home') return '/hrms'
	if (route.name === 'Login') return '/hrms/login'
	
	// Try to construct URL from name and params
	if (route.name && route.params) {
		const baseUrl = '/hrms'
		const routeName = route.name.toLowerCase()
		
		// Common patterns
		if (routeName.includes('dashboard')) {
			return `${baseUrl}/dashboard`
		}
		
		if (routeName.includes('list')) {
			return `${baseUrl}/list`
		}
		
		if (route.params.id) {
			return `${baseUrl}/form/${route.params.id}`
		}
	}
	
	return null
}

/**
 * Safe navigation to home page
 */
export async function navigateToHome() {
	try {
		await navigateTo({ name: "Home" }, { fallbackUrl: "/hrms" })
	} catch (error) {
		console.error("Failed to navigate to home:", error)
		window.location.href = "/hrms"
	}
}

/**
 * Safe navigation to login page
 */
export async function navigateToLogin() {
	try {
		await navigateTo({ name: "Login" }, { fallbackUrl: "/hrms/login" })
	} catch (error) {
		console.error("Failed to navigate to login:", error)
		window.location.href = "/hrms/login"
	}
}

/**
 * Check if current environment supports router navigation reliably
 */
export function isRouterSupported() {
	try {
		// Basic checks for router compatibility
		return !!(
			window.history &&
			window.history.pushState &&
			window.history.replaceState &&
			router
		)
	} catch (error) {
		return false
	}
}

/**
 * Get the current route safely
 */
export function getCurrentRoute() {
	try {
		return router.currentRoute.value
	} catch (error) {
		console.error("Error getting current route:", error)
		return null
	}
}