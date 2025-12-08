// Test file for navigation and browser compatibility
import { navigateTo, navigateToHome, navigateToLogin, isRouterSupported } from '../utils/navigation'
import { getBrowserInfo, needsBrowserFallbacks } from '../utils/browserCompat'

// Test navigation utilities
export async function testNavigation() {
	console.log('Testing navigation utilities...')
	
	try {
		// Test browser detection
		const browserInfo = getBrowserInfo()
		console.log('Browser info:', browserInfo)
		
		// Test router support
		const routerSupported = isRouterSupported()
		console.log('Router supported:', routerSupported)
		
		// Test fallback requirements
		const needsFallbacks = needsBrowserFallbacks()
		console.log('Needs fallbacks:', needsFallbacks)
		
		// Test safe navigation (without actually navigating)
		console.log('Navigation utilities loaded successfully')
		
		return {
			browserInfo,
			routerSupported,
			needsFallbacks,
			status: 'success'
		}
	} catch (error) {
		console.error('Navigation test failed:', error)
		return {
			status: 'error',
			error: error.message
		}
	}
}

// Test login flow (simulation)
export function testLoginFlow() {
	console.log('Testing login flow compatibility...')
	
	try {
		// Simulate checking session
		const isLoggedIn = !!(sessionStorage.getItem('user_id') && sessionStorage.getItem('user_id') !== 'Guest')
		console.log('Login status:', isLoggedIn)
		
		// Test route resolution
		if (window.router) {
			const homeRoute = { name: 'Home' }
			const loginRoute = { name: 'Login' }
			
			try {
				const resolvedHome = window.router.resolve(homeRoute)
				const resolvedLogin = window.router.resolve(loginRoute)
				console.log('Route resolution successful:', {
					home: resolvedHome.href,
					login: resolvedLogin.href
				})
			} catch (error) {
				console.warn('Route resolution failed:', error.message)
			}
		}
		
		return { status: 'success', isLoggedIn }
	} catch (error) {
		console.error('Login flow test failed:', error)
		return { status: 'error', error: error.message }
	}
}

// Run diagnostics
export function runDiagnostics() {
	console.log('Running HRMS navigation diagnostics...')
	
	const results = {
		navigation: testNavigation(),
		loginFlow: testLoginFlow(),
		timestamp: new Date().toISOString(),
		userAgent: navigator.userAgent
	}
	
	console.log('Diagnostics complete:', results)
	return results
}

// Auto-run diagnostics in development
if (import.meta.env.DEV) {
	window.runHRMSDiagnostics = runDiagnostics
	console.log('HRMS diagnostics available: window.runHRMSDiagnostics()')
}