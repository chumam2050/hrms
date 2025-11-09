<template>
	<ListItem>
		<template #left>
			<img 
				v-if="props.doc.checkin_photo" 
				:src="props.doc.checkin_photo" 
				class="h-12 w-12 rounded-full object-cover border-2 border-gray-300"
				alt="Check-in photo"
			/>
			<FeatherIcon v-else name="clock" class="h-5 w-5 text-gray-500" />
			<div class="flex flex-col items-start gap-1.5">
				<div class="text-base font-normal text-gray-800">
					{{ props.doc.log_type === 'IN' ? '🟢' : '🔴' }} 
					{{ props.doc.log_type === 'IN' ? 'Check In' : 'Check Out' }}
				</div>
				<div class="text-xs font-normal text-gray-500">
					<span>{{ formatTimestamp(props.doc.time) }}</span>
				</div>
			</div>
		</template>
		<template #right>
			<FeatherIcon name="chevron-right" class="h-5 w-5 text-gray-500" />
		</template>
	</ListItem>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"

import ListItem from "@/components/ListItem.vue"
import { formatTimestamp } from "@/utils/formatters"

const props = defineProps({
	doc: {
		type: Object,
	},
})
</script>
