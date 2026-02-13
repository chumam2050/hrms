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

                <div v-if="latitude !== null && longitude !== null" class="rounded border-4 translate-z-0 block overflow-hidden w-full h-170">
                  <iframe
                    width="100%"
                    height="170"
                    frameborder="0"
                    scrolling="no"
                    marginheight="0"
                    marginwidth="0"
                    style="border: 0"
                    :src="`https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&amp;output=embed`"
                  />
                </div>

                <div v-else class="w-full h-40 flex flex-col items-center justify-center gap-2">
                  <div class="text-sm text-gray-500">{{ __("Location not available") }}</div>
                  <div v-if="locationLoading" class="text-xs text-gray-400">{{ __("Trying to get your location...") }}</div>
                  <div v-if="locationDenied" class="text-xs text-red-500">{{ __("Location permission denied — please enable location access and retry") }}</div>
                  <Button
                    variant="outline"
                    class="w-40 py-2 text-sm"
                    :loading="locationLoading"
                    :disabled="locationLoading"
                    @click="fetchLocation"
                  >
                    {{ __("Retry Location") }}
                  </Button>
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
                <template v-if="uploadingPhoto">
                  {{ __("Uploading Photo...") }}
                </template>
                <template v-else-if="checkins.insert.loading">
                  {{ __("Submitting...") }}
                </template>
                <template v-else>
                  {{ __("Confirm {0}", [nextAction.label]) }}
                </template>
            </Button>
        </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonPage } from "@ionic/vue"
import { createResource, createListResource, toast, FeatherIcon } from "frappe-ui"
import { computed, inject, ref, watch, onMounted, onBeforeUnmount } from "vue"
import { useRouter, useRoute } from "vue-router"

import { formatTimestamp } from "@/utils/formatters"
import { compressImage, formatFileSize } from "@/utils/imageCompression"

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
const latitude = ref(null)
const longitude = ref(null)
const locationStatus = ref("")
const locationDenied = ref(false)
const locationLoading = ref(false)
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

  // clear flags
  locationDenied.value = false
  locationLoading.value = false

  locationStatus.value = [
    __("Latitude: {0}°", [Number(latitude.value).toFixed(5)]),
    __("Longitude: {0}°", [Number(longitude.value).toFixed(5)]),
  ].join(", ")
}

function handleLocationError(error) {
  locationLoading.value = false
  locationStatus.value = "Unable to retrieve your location"
  if (error) {
    locationStatus.value += `: ERROR(${error.code}): ${error.message}`
    // permission denied
    if (error.code === 1) {
      locationDenied.value = true
      toast({
        title: __('Location permission denied'),
        text: __('Please allow location access in your browser or device settings then retry.'),
        icon: 'alert-circle',
        position: 'bottom-center',
        iconClasses: 'text-red-500',
      })
    }
  }
}

const fetchLocation = () => {
  if (!navigator.geolocation) {
    locationStatus.value = __("Geolocation is not supported by your current browser")
    locationDenied.value = true
  } else {
    locationStatus.value = __("Locating...")
    locationDenied.value = false
    locationLoading.value = true
    // Request a high accuracy position with a reasonable timeout
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, { enableHighAccuracy: true, timeout: 10000 })
  }
}

const handleEmployeeCheckin = () => {
  checkinTimestamp.value = dayjs().format("YYYY-MM-DD HH:mm:ss")

  if (settings.data?.allow_geolocation_tracking) {
    fetchLocation()
    console.log("here")
  }
}

// Camera functions
const triggerCamera = () => cameraInput.value.click()

const handlePhotoCapture = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    // Show original file size
    console.log(`Original photo size: ${formatFileSize(file.size)}`)

    // Compress image for faster upload (especially on mobile)
    const compressedFile = await compressImage(file, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      mimeType: 'image/jpeg'
    })

    photoFile.value = compressedFile

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => photoPreview.value = e.target.result
    reader.readAsDataURL(compressedFile)

    // Show success message for large files
    if (file.size > 1024 * 1024) { // > 1MB
      toast({
        title: __('Photo Optimized'),
        text: __('Photo compressed for faster upload'),
        icon: 'check-circle',
        position: 'bottom-center',
        iconClasses: 'text-green-500'
      })
    }
  } catch (error) {
    console.error('Photo compression error:', error)
    // Fall back to original file if compression fails
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

    // Add timeout for upload (60 seconds for mobile networks)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const response = await fetch('/api/method/upload_file', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token
      },
      body: formData,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    photoUrl.value = data.message.file_url
    console.log('Photo uploaded successfully:', data.message.file_url)
    return data.message.file_url
  } catch (error) {
    console.error('Photo upload error:', error)
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      toast({
        title: __("Upload Timeout"),
        text: __("Photo upload took too long. Please check your internet connection and try again."),
        icon: 'alert-circle',
        position: 'bottom-center',
        iconClasses: 'text-red-500'
      })
    } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
      toast({
        title: __("Network Error"),
        text: __("Unable to upload photo. Please check your internet connection."),
        icon: 'alert-circle',
        position: 'bottom-center',
        iconClasses: 'text-red-500'
      })
    } else {
      toast({
        title: __("Upload Failed"),
        text: error.message || __("Failed to upload photo. Please try again."),
        icon: 'alert-circle',
        position: 'bottom-center',
        iconClasses: 'text-red-500'
      })
    }
    return null
  } finally {
    uploadingPhoto.value = false
  }
}

const submitLog = (logType) => {
  const actionLabel = logType === 'IN' ? __('Check-in') : __('Check-out')

  const doSubmit = async () => {
    // Prevent multiple submissions
    if (uploadingPhoto.value || checkins.insert.loading) {
      return
    }

    // If the system requires geolocation for checkin, ensure we have coordinates
    if (settings.data?.allow_geolocation_tracking) {
      if (locationLoading.value) {
        toast({ title: __('Please wait'), text: __('Getting current location, please try again in a moment.'), icon: 'alert-circle', position: 'bottom-center', iconClasses: 'text-gray-500' })
        return
      }

      if (latitude.value === null || longitude.value === null) {
      const suggestion = locationDenied.value ? __('Please allow location access and retry.') : __('Tap Retry to try again.')
      toast({ title: __("Location required"), text: __("Your current location is required to check-in. {0}", [suggestion]), icon: 'alert-circle', position: 'bottom-center', iconClasses: 'text-red-500' })
      return
      }
    }

    if (settings.data?.require_checkin_selfie && !photoFile.value) {
      toast({ title: __("Error"), text: __("Please capture a selfie before checking in"), icon: 'alert-circle', position: 'bottom-center', iconClasses: 'text-red-500' })
      return
    }

    let checkinPhotoUrl = null
    if (photoFile.value) {
      // Show upload progress toast
      toast({
        title: __('Uploading Photo'),
        text: __('Please wait while your photo is being uploaded...'),
        icon: 'upload',
        position: 'bottom-center',
        iconClasses: 'text-blue-500'
      })
      
      checkinPhotoUrl = await uploadPhoto()
      if (!checkinPhotoUrl && photoFile.value) {
        // Upload failed and user was already notified via toast in uploadPhoto
        return
      }
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

// If settings were not loaded at mount, fetch location when the setting becomes available
watch(
  () => settings.data?.allow_geolocation_tracking,
  (allowed) => {
    if (allowed) {
      // ensure we have an initial timestamp and request location
      checkinTimestamp.value = checkinTimestamp.value || dayjs().format("YYYY-MM-DD HH:mm:ss")
      fetchLocation()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  socket.emit("doctype_unsubscribe", DOCTYPE)
  socket.off("list_update")
})
</script>
