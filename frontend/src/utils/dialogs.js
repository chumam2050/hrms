import { alertController, toastController } from "@ionic/vue"

export const showErrorAlert = async (message) => {
	const alert = await alertController.create({
		header: "Error",
		message,
		buttons: ["OK"],
	})

	await alert.present()
}

export const showToast = async (message, duration = 2000) => {
	const toast = await toastController.create({
		message,
		duration,
		position: "bottom",
	})

	await toast.present()
}
