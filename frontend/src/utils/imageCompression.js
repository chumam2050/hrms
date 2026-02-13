/**
 * Compress and resize an image file for efficient upload
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1024)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1024)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @param {string} options.mimeType - Output format (default: 'image/jpeg')
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, options = {}) {
	const {
		maxWidth = 1024,
		maxHeight = 1024,
		quality = 0.8,
		mimeType = 'image/jpeg'
	} = options

	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		
		reader.onerror = () => reject(new Error('Failed to read file'))
		
		reader.onload = (e) => {
			const img = new Image()
			
			img.onerror = () => reject(new Error('Failed to load image'))
			
			img.onload = () => {
				// Calculate new dimensions while maintaining aspect ratio
				let { width, height } = img
				
				if (width > maxWidth || height > maxHeight) {
					const aspectRatio = width / height
					
					if (width > height) {
						width = Math.min(width, maxWidth)
						height = width / aspectRatio
					} else {
						height = Math.min(height, maxHeight)
						width = height * aspectRatio
					}
				}
				
				// Create canvas and draw resized image
				const canvas = document.createElement('canvas')
				canvas.width = width
				canvas.height = height
				
				const ctx = canvas.getContext('2d')
				ctx.drawImage(img, 0, 0, width, height)
				
				// Convert canvas to blob
				canvas.toBlob(
					(blob) => {
						if (!blob) {
							reject(new Error('Failed to compress image'))
							return
						}
						
						// Create new File object from blob
						const compressedFile = new File(
							[blob],
							file.name,
							{
								type: mimeType,
								lastModified: Date.now()
							}
						)
						
						// Log compression results
						const originalSizeMB = (file.size / 1024 / 1024).toFixed(2)
						const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2)
						const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1)
						
						console.log(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% reduction)`)
						
						resolve(compressedFile)
					},
					mimeType,
					quality
				)
			}
			
			img.src = e.target.result
		}
		
		reader.readAsDataURL(file)
	})
}

/**
 * Check if a file is an image
 * @param {File} file - File to check
 * @returns {boolean} True if file is an image
 */
export function isImageFile(file) {
	return file && file.type.startsWith('image/')
}

/**
 * Get human-readable file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
