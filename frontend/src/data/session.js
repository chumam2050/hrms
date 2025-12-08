import { computed, reactive } from "vue"
import { createResource, call } from "frappe-ui"
import { userResource } from "./user"
import { employeeResource } from "./employee"
import router from "@/router"
import { translationsPlugin } from "@/plugins/translationsPlugin"
import { navigateToHome, navigateToLogin } from "@/utils/navigation"

export function sessionUser() {
	let cookies = new URLSearchParams(document.cookie.split("; ").join("&"))
	let _sessionUser = cookies.get("user_id")
	if (_sessionUser === "Guest") {
		_sessionUser = null
	}
	return _sessionUser
}

async function handleLogin(response) {
	if (response.message === "Logged In") {
		try {
			await userResource.reload()
			await employeeResource.reload()

			session.user = sessionUser()
			
			// Reload translations with user's language preference
			await translationsPlugin.reload()
			
			// Check if user has a different language preference
			const userLang = userResource.data?.language
			const currentLang = document.documentElement.lang || 'en'
			
			if (userLang && userLang !== currentLang && userLang !== 'en') {
				// User has different language, need to reload to apply it
				window.location.href = '/hrms'
			} else {
				// Use safe navigation utility
				await navigateToHome()
			}
		} catch (error) {
			console.error("Error during login redirect:", error)
			// Fallback to window.location for problematic browsers
			window.location.href = '/hrms'
		}
	}
}

export const session = reactive({
	login: async (email, password) => {
		const response = await call("login", { usr: email, pwd: password })
		handleLogin(response)
		return response
	},
	otp: async (tmp_id, otp) => {
		const response = await call("login", { tmp_id, otp })
		handleLogin(response)
		return response
	},
	logout: createResource({
		url: "logout",
		onSuccess() {
			try {
				userResource.reset()
				employeeResource.reset()

				session.user = sessionUser()
				
				// Use window.location for logout to ensure clean state
				window.location.href = '/hrms/login'
			} catch (error) {
				console.error("Error during logout:", error)
				// Fallback
				window.location.href = '/login'
			}
		},
	}),
	user: sessionUser(),
	isLoggedIn: computed(() => !!session.user),
})
