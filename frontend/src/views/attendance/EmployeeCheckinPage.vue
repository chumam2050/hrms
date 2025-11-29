<template>
  <ion-page>
  	<ion-header class="ion-no-border">
		<div class="w-full sm:w-96">
			<div
				class="flex flex-row bg-white shadow-sm py-4 px-3 items-center justify-between border-b"
			>
				<div class="flex flex-row items-center">
					<Button variant="ghost" class="!px-1 mr-1 hover:bg-white" @click="router.back()">
						<FeatherIcon name="chevron-left" class="h-5 w-5" />
					</Button>
                    <h2 class="text-xl font-semibold text-gray-900">{{ pageTitle }}</h2>
				</div>
			</div>
		</div>
	</ion-header>

    <ion-content :fullscreen="true">
        <div class="flex flex-col items-center mb-7 gap-4 p-4 bg-white w-full sm:w-96">
            <div class="flex flex-col gap-1.5 mt-2 items-center justify-center">
                <div class="font-bold text-xl">
                {{ dayjs(checkinTimestamp).format("hh:mm:ss a") }}
                </div>
                <div class="font-medium text-gray-500 text-sm">
                {{ dayjs().format("D MMM, YYYY") }}
                </div>
            </div>

            <template v-if="settings.data?.allow_geolocation_tracking">
                <span v-if="locationStatus" class="font-medium text-gray-500 text-sm">
                {{ locationStatus }}
                </span>

                <div class="rounded border-4 translate-z-0 block overflow-hidden w-full h-170">
                <iframe
                    width="100%"
                    height="170"
                    frameborder="0"
                    scrolling="no"
                    marginheight="0"
                    marginwidth="0"
                    style="border: 0"
                    :src="`https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&amp;output=embed`"
                >
                </iframe>
                </div>
            </template>

            <!-- Camera Section -->
            <div v-if="settings.data?.require_checkin_selfie" class="w-full flex flex-col gap-3">
                <Button variant="outline" class="w-full py-5 text-sm" @click="triggerCamera">
                <template #prefix>
                    <FeatherIcon name="camera" class="w-4" />
                </template>
                {{ photoPreview ? __("Retake Selfie") : __("Capture Selfie") }}
                </Button>

                <!-- Photo Preview -->
                <div v-if="photoPreview" class="relative w-full">
                <img :src="photoPreview" class="w-full h-48 object-cover rounded-lg border-2 border-gray-300" />
                <button
                    @click="removePhoto"
                    class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                >
                    <FeatherIcon name="x" class="w-4 h-4" />
                </button>
                </div>

                <!-- Hidden file input -->
                <input
                ref="cameraInput"
                type="file"
                accept="image/*"
                capture="user"
                class="hidden"
                @change="handlePhotoCapture"
                />
            </div>

            <Button :loading="checkins.insert.loading || uploadingPhoto" variant="solid" class="w-full py-5 text-sm disabled:bg-gray-700" @click="submitLog(nextAction.action)">
                {{ __("Confirm {0}", [nextAction.label]) }}
            </Button>
        </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage } from "@ionic/vue"
import { createResource, createListResource, toast, FeatherIcon } from "frappe-ui"
import { computed, inject, ref, onMounted, onBeforeUnmount } from "vue"
import { useRouter, useRoute } from "vue-router"

import { formatTimestamp } from "@/utils/formatters"

const DOCTYPE = "Employee Checkin"

const socket = inject("$socket")
const employee = inject("$employee")
const dayjs = inject("$dayjs")
const __ = inject("$translate")
const router = useRouter()
const route = useRoute()

// Page title can be passed from the caller (CheckInPanel) via route params.
// Accept a string param and fall back to the computed action label or a default.
const pageTitle = computed(() => {
  const p = route?.params?.pageTitle
  if (typeof p === 'string' && p.trim()) return p
  return nextAction.value?.label || __('Check In')
})

// router available for navigation (back/redirect)

const checkinTimestamp = ref(null)
const latitude = ref(0)
const longitude = ref(0)
const locationStatus = ref("")
const cameraInput = ref(null)
const photoFile = ref(null)
const photoPreview = ref(null)
const photoUrl = ref(null)
const uploadingPhoto = ref(false)
const settings = createResource({
  url: "hrms.api.get_hr_settings",
  auto: true,
})

const checkins = createListResource({
  doctype: DOCTYPE,
  fields: ["name", "employee", "employee_name", "log_type", "time", "device_id"],
  filters: { employee: employee.data.name },
  orderBy: "time desc",
})
checkins.reload()

const lastLog = computed(() => {
  if (checkins.list.loading || !checkins.data) return {}
  return checkins.data[0]
})

const lastLogType = computed(() => lastLog?.value?.log_type === "IN" ? "check-in" : "check-out")

const nextAction = computed(() => lastLog?.value?.log_type === "IN"
  ? { action: "OUT", label: __("Check Out") }
  : { action: "IN", label: __("Check In") }
)

function handleLocationSuccess(position) {
  latitude.value = position.coords.latitude
  longitude.value = position.coords.longitude

  locationStatus.value = [
    __("Latitude: {0}°", [Number(latitude.value).toFixed(5)]),
    __("Longitude: {0}°", [Number(longitude.value).toFixed(5)]),
  ].join(", ")
}

function handleLocationError(error) {
  locationStatus.value = "Unable to retrieve your location"
  if (error) locationStatus.value += `: ERROR(${error.code}): ${error.message}`
}

const fetchLocation = () => {
  if (!navigator.geolocation) {
    locationStatus.value = __("Geolocation is not supported by your current browser")
  } else {
    locationStatus.value = __("Locating...")
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError)
  }
}

const handleEmployeeCheckin = () => {
  checkinTimestamp.value = dayjs().format("YYYY-MM-DD HH:mm:ss")

  if (settings.data?.allow_geolocation_tracking) {
    fetchLocation()
  }
}

// Camera functions
const triggerCamera = () => cameraInput.value.click()

const handlePhotoCapture = (event) => {
  const file = event.target.files[0]
  if (file) {
    photoFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => photoPreview.value = e.target.result
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  photoFile.value = null
  photoPreview.value = null
  photoUrl.value = null
  if (cameraInput.value) cameraInput.value.value = ''
}

const uploadPhoto = async () => {
  if (!photoFile.value) return null
  uploadingPhoto.value = true

  try {
    const formData = new FormData()
    formData.append('file', photoFile.value)
    formData.append('is_private', 0)
    formData.append('folder', 'Home/Attachments')

    const response = await fetch('/api/method/upload_file', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token
      },
      body: formData
    })

    if (!response.ok) throw new Error('Upload failed')
    const data = await response.json()
    photoUrl.value = data.message.file_url
    return data.message.file_url
  } catch (error) {
    console.error('Photo upload error:', error)
    toast({ title: __("Error"), text: __("Failed to upload photo"), icon: 'alert-circle', position: 'bottom-center', iconClasses: 'text-red-500' })
    return null
  } finally {
    uploadingPhoto.value = false
  }
}

const submitLog = (logType) => {
  const actionLabel = logType === 'IN' ? __('Check-in') : __('Check-out')

  const doSubmit = async () => {
    if (settings.data?.require_checkin_selfie && !photoFile.value) {
      toast({ title: __("Error"), text: __("Please capture a selfie before checking in"), icon: 'alert-circle', position: 'bottom-center', iconClasses: 'text-red-500' })
      return
    }

    let checkinPhotoUrl = null
    if (photoFile.value) {
      checkinPhotoUrl = await uploadPhoto()
      if (!checkinPhotoUrl && photoFile.value) return
    }

    checkins.insert.submit({
      employee: employee.data.name,
      log_type: logType,
      time: checkinTimestamp.value,
      latitude: latitude.value,
      longitude: longitude.value,
      checkin_photo: checkinPhotoUrl,
    }, {
      onSuccess() {
        // Reset local state
        removePhoto()
        toast({ title: __('Success'), text: __('{0} successful!', [actionLabel]), icon: 'check-circle', position: 'bottom-center', iconClasses: 'text-green-500' })
        // notify other parts of the app (Home / CheckInPanel) that checkin succeeded
        try {
          window.dispatchEvent(new CustomEvent('hrms:checkin-succeeded', { detail: { action: logType } }))
        } catch (e) {
          /* noop */
        }
        // Redirect back to Home page
        router.replace({ name: 'Home' })
      },
      onError(error) {
        let messages = error.messages || []
        for (const message of messages) {
          toast({ title: __('Error'), text: message || __('{0} failed!', [actionLabel]), icon: 'alert-circle', position: 'bottom-center', iconClasses: 'text-red-500' })
        }
      }
    })
  }

  doSubmit()
}

onMounted(() => {
  socket.emit("doctype_subscribe", DOCTYPE)
  socket.on("list_update", (data) => {
    if (data.doctype == DOCTYPE) checkins.reload()
  })
  // Prepare timestamp and location
  handleEmployeeCheckin()
})

onBeforeUnmount(() => {
  socket.emit("doctype_unsubscribe", DOCTYPE)
  socket.off("list_update")
})
</script>
