<template>
	<ion-page>
		<ion-content class="ion-padding">
			<div class="flex flex-col h-screen w-screen">
				<div class="w-full sm:w-96">
					<header
						class="flex flex-row bg-white shadow-sm py-4 px-3 items-center justify-between border-b sticky top-0 z-10"
					>
						<div class="flex flex-row items-center">
							<Button
								variant="ghost"
								class="!pl-0 hover:bg-white"
								@click="router.back()"
							>
								<FeatherIcon name="chevron-left" class="h-5 w-5" />
							</Button>
							<h2 class="text-xl font-semibold text-gray-900">{{ __("Settings") }} </h2>
						</div>
					</header>

					<div class="flex flex-col gap-6 my-4 w-full p-4">
						<section class="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
							<div class="mb-3">
								<div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
									{{ __("Notifications") }}
								</div>
								<h3 class="mt-1 text-sm font-semibold text-gray-900">
									{{ __("Push Notifications") }}
								</h3>
							</div>
							<Switch
								size="md"
								:label="__('Enable Push Notifications')"
								:class="pushNotificationDescription ? 'p-2' : ''"
								:model-value="pushNotificationState"
								:disabled="disablePushSetting"
								:description="pushNotificationDescription"
								@update:model-value="togglePushNotifications"
							/>
							<div
								v-if="isLoading"
								class="mt-2 flex items-center justify-center gap-2"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">
									{{ pushNotificationState ? __("Disabling Push Notifications...") : __("Enabling Push Notifications...") }}
								</span>
							</div>
						</section>

						<section class="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
							<div class="mb-3">
								<div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
									{{ __("Attendance") }}
								</div>
								<h3 class="mt-1 text-sm font-semibold text-gray-900">
									{{ __("Shift Reminders") }}
								</h3>
							</div>
							<Switch
								size="md"
								:label="__('Shift End Reminder')"
								:model-value="shiftEndReminderEnabled"
								:disabled="!shiftEndReminderGlobalEnabled || isShiftReminderLoading"
								:description="shiftReminderDescription"
								@update:model-value="toggleShiftEndReminder"
							/>
							<div
								v-if="isShiftReminderLoading"
								class="mt-2 flex items-center justify-center gap-2"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">{{ __("Updating...") }}</span>
							</div>
						</section>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonPage, IonContent } from "@ionic/vue"
import { useRouter } from "vue-router"
import { FeatherIcon, Switch, toast, LoadingIndicator } from "frappe-ui"

import { computed, inject, onMounted, ref } from "vue"

import { arePushNotificationsEnabled } from "@/data/notifications"

const __ = inject("$translate")
const router = useRouter()
const pushNotificationState = ref(
	window.frappePushNotification?.isNotificationEnabled()
)
const isLoading = ref(false)
const shiftEndReminderEnabled = ref(true)
const shiftEndReminderGlobalEnabled = ref(false)
const shiftEndReminderMinutes = ref(30)
const isShiftReminderLoading = ref(false)

onMounted(async () => {
	try {
		const res = await fetch(
			"/api/method/hrms.api.system_settings.get_shift_end_reminder_settings",
			{ credentials: "same-origin", headers: { Accept: "application/json" } }
		)
		const data = await res.json()
		if (data?.message) {
			shiftEndReminderGlobalEnabled.value = data.message.global_enabled
			shiftEndReminderEnabled.value = data.message.user_enabled
			shiftEndReminderMinutes.value = data.message.minutes_before
		}
	} catch (e) {
		// silently fail
	}
})

async function toggleShiftEndReminder(newValue) {
	isShiftReminderLoading.value = true
	try {
		const res = await fetch(
			"/api/method/hrms.api.system_settings.set_shift_end_reminder_preference",
			{
				method: "POST",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
				body: new URLSearchParams({ enabled: newValue ? "1" : "0" }),
			}
		)
		const data = await res.json()
		if (data?.message?.success) {
			shiftEndReminderEnabled.value = newValue
			toast({
				title: __("Success"),
				text: newValue
					? __("Shift end reminder enabled")
					: __("Shift end reminder disabled"),
				icon: "check-circle",
				position: "bottom-center",
				iconClasses: "text-green-500",
			})
		}
	} catch (e) {
		toast({
			title: __("Error"),
			text: __("Failed to update preference"),
			icon: "alert-circle",
			position: "bottom-center",
			iconClasses: "text-red-500",
		})
	} finally {
		isShiftReminderLoading.value = false
	}
}

const disablePushSetting = computed(() => {
	return (
		!(
			window.frappe?.boot.push_relay_server_url &&
			arePushNotificationsEnabled.data
		) || isLoading.value
	)
})

const pushNotificationDescription = computed(() => {
	return !(
		window.frappe?.boot.push_relay_server_url &&
		arePushNotificationsEnabled.data
	)
		? __("Push notifications have been disabled on your site")
		: ""
})

const shiftReminderDescription = computed(() => {
	if (!shiftEndReminderGlobalEnabled.value) {
		return __("Shift end reminders are disabled by your administrator")
	}

	return shiftEndReminderMinutes.value
		? __("Open attendance and notify me {0} minutes before my shift ends").replace(
				"{0}",
				shiftEndReminderMinutes.value,
			)
		: __("Open attendance before your shift ends")
})

const togglePushNotifications = (newValue) => {
	if (newValue) {
		enablePushNotifications()
	} else {
		isLoading.value = true
		window.frappePushNotification
			.disableNotification()
			.then((data) => {
				pushNotificationState.value = false // Disable the switch
				// TODO: add commonfied toast util for success and error messages
				toast({
					title: __("Success"),
					text: __("Push notifications disabled"),
					icon: "check-circle",
					position: "bottom-center",
					iconClasses: "text-green-500",
				})
			})
			.catch((error) => {
				toast({
					title: __("Error"),
					text: __(error.message),
					icon: "alert-circle",
					position: "bottom-center",
					iconClasses: "text-red-500",
				})
			})
			.finally(() => {
				isLoading.value = false
			})
	}
}

const enablePushNotifications = () => {
	isLoading.value = true

	window.frappePushNotification
		.enableNotification()
		.then((data) => {
			if (data.permission_granted) {
				pushNotificationState.value = true
			} else {
				toast({
					title: __("Error"),
					text: __("Push Notification permission denied"),
					icon: "alert-circle",
					position: "bottom-center",
					iconClasses: "text-red-500",
				})
				pushNotificationState.value = false
			}
		})
		.catch((error) => {
			toast({
				title: __("Error"),
				text: __(error.message),
				icon: "alert-circle",
				position: "bottom-center",
				iconClasses: "text-red-500",
			})
			pushNotificationState.value = false
		})
		.finally(() => {
			isLoading.value = false
		})
}
</script>
