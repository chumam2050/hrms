import { computed, reactive } from "vue"
import { createResource, call } from "frappe-ui"
import { userResource } from "./user"
import { employeeResource } from "./employee"

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
		// Use window.location for a reliable redirect that works across all browsers
		// and avoids Vue Router NavigationFailure silent failures in PWA mode.
		window.location.href = '/hrms'
	}
}

export const session = reactive({
	login: async (email, password) => {
		const response = await call("login", { usr: email, pwd: password })
		await handleLogin(response)
		return response
	},
	otp: async (tmp_id, otp) => {
		const response = await call("login", { tmp_id, otp })
		await handleLogin(response)
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
