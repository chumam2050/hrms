<template>
	<ion-page>
		<ion-content class="ion-padding">
			<div class="flex h-screen w-screen flex-col justify-center bg-white">
				<div class="flex flex-col mx-auto gap-3 items-center">
					<FrappeHRLogo class="h-8 w-8" />
					<div class="text-3xl font-semibold text-gray-900 text-center">
						{{ __("Login to Frappe HR") }}
					</div>
				</div>

				<div class="mx-auto mt-10 w-full px-8 sm:w-96">
					<form v-if="!user_pass_login_disabled.data" class="flex flex-col space-y-4" @submit.prevent="submit">
						<Input
							:label="__('Email')"
							:placeholder="__('johndoe@mail.com')"
							v-model="email"
							type="text"
							autocomplete="username"
						/>
						<div class="relative">
							<TextInput
								:label="__('Password')"
								:type="showPassword ? 'text' : 'password'"
								placeholder="••••••"
								v-model="password"
								autocomplete="current-password"
								class="pr-12"
							>
								<template #suffix>
									<FeatherIcon
										class="w-6"
										:name="showPassword ? 'eye' : 'eye-off'"
										:aria-pressed="showPassword.toString()"
										:aria-label="showPassword ? __('Hide password') : __('Show password')"
										@click.prevent="showPassword = !showPassword"
									/>
								</template>
							</TextInput>
						</div>
					<div class="text-right">
						<button
							type="button"
							class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
							@click="showForgotPasswordDialog = true"
						>
							{{ __("Forgot Password?") }}
						</button>
					</div>
						<ErrorMessage :message="errorMessage" />
						<Button
							:loading="isLoggingIn || session.login.loading"
							variant="solid"
							class="disabled:bg-gray-700 disabled:text-white !mt-6"
						>
							{{ __("Login") }}
						</Button>
					</form>

					<template v-if="authProviders.data?.length">
						<div v-if="!user_pass_login_disabled.data" class="text-center text-sm text-gray-600 my-4">or</div>
						<div class="space-y-4">
							<a
								v-for="provider in authProviders.data"
								:key="provider.name"
								class="flex items-center justify-center gap-2 transition-colors focus:outline-none text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring focus-visible:ring-gray-400 h-7 text-base p-2 rounded"
								:href="provider.auth_url"
							>
								<img class="h-4 w-4" :src="provider.icon" :alt="provider.provider_name" />
								<span>Login with {{ provider.provider_name }}</span>
							</a>
						</div>
					</template>

					<div v-else-if="user_pass_login_disabled.data" class="text-center text-gray-600 py-8">{{ __("No login methods are available. Please contact your administrator.") }}</div>
				</div>
			</div>

			<Dialog v-model="resetPassword.showDialog">
				<template #body-title>
					<h2 class="text-lg font-bold">{{ __("Reset Password") }} </h2>
				</template>
				<template #body-content>
					<p>
						{{ __("Your password has expired. Please reset your password to continue") }}
					</p>
				</template>
				<template #actions>
					<a
						class="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-700 focus-visible:ring focus-visible:ring-gray-400 h-7 text-base px-2 rounded"
						:href="resetPassword.link"
						target="_blank"
					>
						{{ __("Go to Reset Password page") }}
					</a>
				</template>
			</Dialog>

			<Dialog v-model="otp.showDialog">
				<template #body-title>
					<h2 class="text-lg font-bold">{{ __("OTP Verification") }}</h2>
				</template>
				<template #body-content>
					<p class="mb-4" v-if="otp.verification.prompt">
						{{ otp.verification.prompt }}
					</p>

					<form class="flex flex-col space-y-4" @submit.prevent="submit">
						<Input
							:label="__('OTP Code')"
							type="text"
							placeholder="000000"
							v-model="otp.code"
							autocomplete="one-time-code"
						/>
						<ErrorMessage :message="errorMessage" />
						<Button
							:loading="session.otp.loading"
							variant="solid"
							class="disabled:bg-gray-700 disabled:text-white !mt-6"
						>
							{{ __("Verify") }}
						</Button>
					</form>
				</template>
			</Dialog>

			<Dialog v-model="showForgotPasswordDialog">
				<template #body-title>
					<h2 class="text-lg font-bold">{{ __("Reset Password") }}</h2>
				</template>
				<template #body-content>
					<div v-if="!forgotPasswordSent" class="flex flex-col space-y-4">
						<p class="text-gray-600">
							{{ __("Enter your email address and we'll send you a password reset link.") }}
						</p>
						<form @submit.prevent="submitForgotPassword" class="flex flex-col space-y-4">
							<Input
								:label="__('Email')"
								:placeholder="__('johndoe@mail.com')"
								v-model="forgotPasswordEmail"
								type="email"
								required
							/>
							<ErrorMessage :message="forgotPasswordError" />
							<Button
								:loading="isSendingReset"
								variant="solid"
								class="disabled:bg-gray-700 disabled:text-white"
							>
								{{ __("Send Reset Link") }}
							</Button>
						</form>
					</div>

					<div v-else class="flex flex-col space-y-4 text-center">
						<svg class="w-12 h-12 mx-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
						</svg>
						<h3 class="text-lg font-semibold">{{ __("Reset Link Sent!") }}</h3>
						<p class="text-gray-600">
							{{ __("Check your email for the password reset link. The link will expire in 24 hours.") }}
						</p>
						<p class="text-sm text-gray-500">
							{{ __("Email: {0}").replace("{0}", forgotPasswordEmail) }}
						</p>
					</div>
				</template>
				<template v-if="!forgotPasswordSent" #actions>
					<button
						type="button"
						class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
						@click="showForgotPasswordDialog = false"
					>
						{{ __("Cancel") }}
					</button>
				</template>
				<template v-else #actions>
					<button
						type="button"
						class="px-4 py-2 text-white bg-gray-900 hover:bg-gray-800 rounded"
						@click="closeForgotPasswordDialog"
					>
						{{ __("Back to Login") }}
					</button>
				</template>
			</Dialog>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonPage, IonContent } from "@ionic/vue"
import { inject, reactive, ref } from "vue"
import { useRouter } from "@ionic/vue-router"
import { Input, FeatherIcon, TextInput, Button, ErrorMessage, Dialog, createResource } from "frappe-ui"

import FrappeHRLogo from "@/components/icons/FrappeHRLogo.vue"

const email = ref(null)
const password = ref(null)
const showPassword = ref(false)
const errorMessage = ref("")
// local flag to indicate login button loading state so we show progress immediately
const isLoggingIn = ref(false)

const resetPassword = reactive({
	showDialog: false,
	link: "",
})
const otp = reactive({
	showDialog: false,
	tmp_id: "",
	code: "",
	verification: {},
})

const session = inject("$session")
const __ = inject("$translate")
const router = useRouter()

const showForgotPasswordDialog = ref(false)
const forgotPasswordEmail = ref(null)
const forgotPasswordError = ref("")
const forgotPasswordSent = ref(false)
const isSendingReset = ref(false)

async function submitForgotPassword() {
	try {
		if (!forgotPasswordEmail.value) {
			forgotPasswordError.value = __("Email is required")
			return
		}

		isSendingReset.value = true

		const requestUrl = `/api/method/hrms.utils.password_reset.send_password_reset_email_by_email?email=${encodeURIComponent(forgotPasswordEmail.value.trim())}`
		const response = await fetch(requestUrl, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
			credentials: "same-origin",
		})

		const payload = await response.json().catch(() => ({}))
		if (!response.ok) {
			const msg = payload?.message || __("Failed to send reset link")
			throw new Error(msg)
		}

		if (payload.message && payload.message.success) {
			forgotPasswordSent.value = true
			forgotPasswordError.value = ""
		} else {
			const msg = payload?.message?.message || __("Failed to send reset link")
			forgotPasswordError.value = msg
		}
	} catch (error) {
		const errorMsg = error.messages?.join("\n") || error.message || __("Failed to send reset link")
		forgotPasswordError.value = errorMsg
	} finally {
		isSendingReset.value = false
	}
}

function closeForgotPasswordDialog() {
	showForgotPasswordDialog.value = false
	forgotPasswordEmail.value = null
	forgotPasswordError.value = ""
	forgotPasswordSent.value = false
}

async function submit(e) {
	try {
		let response
		if (otp.showDialog) {
			response = await session.otp(otp.tmp_id, otp.code)
		} else {
			isLoggingIn.value = true
			try {
				response = await session.login(email.value, password.value)
			} finally {
				isLoggingIn.value = false
			}
		}

		// On successful auth, force users into HRMS module.
		if (!response?.verification && response?.message !== "Password Reset") {
			router.push("/home")
			return
		}

		if (response.message === "Password Reset") {
			resetPassword.showDialog = true
			resetPassword.link = response.redirect_to
		} else {
			resetPassword.showDialog = false
			resetPassword.link = ""
		}

		// OTP verification
		if (response.verification) {
			if (response.verification.setup) {
				otp.showDialog = true
				otp.tmp_id = response.tmp_id
				otp.verification = response.verification
			} else {
				// Don't bother handling impossible OTP setup (e.g. no phone number).
				window.open("/login?redirect-to=" + encodeURIComponent(window.location.pathname), "_blank")
			}
		}
	} catch (error) {
		errorMessage.value = error.messages.join("\n")
	}
}

const user_pass_login_disabled = createResource({
	url: "hrms.api.system_settings.get_user_pass_login_disabled",
	method: 'GET',
	initialData: 1,
	auto: true,
})

const authProviders = createResource({
	url: "hrms.api.oauth.oauth_providers",
	auto: true,
})
</script>
