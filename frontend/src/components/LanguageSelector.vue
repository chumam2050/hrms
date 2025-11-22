<template>
	<div
		class="bg-white w-full flex flex-col items-center justify-center pb-5 max-h-[calc(100vh-5rem)]"
	>
		<!-- Header -->
		<div
			class="w-full flex flex-row gap-2 pt-8 pb-5 border-b justify-center items-center sticky top-0 z-[100]"
		>
			<span class="text-gray-900 font-bold text-lg text-center">
				{{ __("Language") }}
			</span>
		</div>

		<!-- Language List -->
		<div class="w-full flex flex-col p-4 overflow-y-auto">
			<div
				v-for="lang in languages"
				:key="lang.language_code"
				class="flex flex-row items-center justify-between w-full p-4 border-b cursor-pointer hover:bg-gray-50"
				@click="selectLanguage(lang.language_code)"
			>
				<div class="text-gray-900 text-base">{{ lang.language_name }}</div>
				<FeatherIcon
					v-if="currentLanguage === lang.language_code"
					name="check"
					class="h-5 w-5 text-blue-500"
				/>
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="flex items-center justify-center p-8">
			<div class="text-gray-600">{{ __("Loading languages...") }}</div>
		</div>
	</div>
</template>

<script setup>
import { ref, inject, onMounted, watch } from "vue"
import { FeatherIcon, createResource } from "frappe-ui"
import { showErrorAlert, showToast } from "@/utils/dialogs"

const __ = inject("$translate")
const user = inject("$user")

const emit = defineEmits(["close"])

const languages = ref([])
const currentLanguage = ref(null)
const isLoading = ref(true)

// Fetch available languages
const languagesResource = createResource({
	url: "frappe.translate.get_all_languages",
	params: { with_language_name: true },
	auto: true,
	onSuccess(data) {
		languages.value = data
		isLoading.value = false
		// Set current language after languages are loaded
		setCurrentLanguage()
	},
	onError(error) {
		console.error("Failed to load languages:", error)
		showErrorAlert(__("Failed to load languages"))
		isLoading.value = false
	},
})

const setCurrentLanguage = () => {
	// User.language now stores the language code (e.g., "id") not the name (e.g., "Indonesia")
	const userLanguageCode = user.data.language
	if (userLanguageCode) {
		currentLanguage.value = userLanguageCode
		console.log("User language code:", userLanguageCode)
	} else {
		currentLanguage.value = "en"
	}
}

const selectLanguage = async (lang) => {
	if (lang !== currentLanguage.value) {
		// Validate language value
		if (!lang || lang === 'undefined') {
			console.error('Invalid language value:', lang)
			showErrorAlert(__("Invalid language selection"))
			return
		}
		
		try {
			console.log('Updating language to:', lang)
			// Use GET request to avoid CSRF token issues
			const response = await fetch(`/api/method/hrms.api.language.update_user_language?language=${encodeURIComponent(lang)}`, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			})
			
			const data = await response.json()
			
			if (response.ok && data.message) {
				showToast(__("Language updated successfully. Refreshing..."))
				
				// Clear service worker cache
				if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
					caches.keys().then((cacheNames) => {
						return Promise.all(
							cacheNames.map((cacheName) => {
								return caches.delete(cacheName)
							})
						)
					}).then(() => {
						// Unregister all service workers
						navigator.serviceWorker.getRegistrations().then((registrations) => {
							for (let registration of registrations) {
								registration.unregister()
							}
						})
					})
				}
				
				setTimeout(() => {
					// Force hard reload to clear all caches
					window.location.href = window.location.href
				}, 1000)
			} else {
				throw new Error(data.exception || 'Failed to update language')
			}
		} catch (error) {
			console.error("Failed to update language:", error)
			showErrorAlert(__("Failed to update language"))
		}
	}
}

onMounted(() => {
	// If languages are already loaded, set current language
	if (languages.value.length > 0) {
		setCurrentLanguage()
	}
})
</script>
