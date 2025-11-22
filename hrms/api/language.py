import frappe


@frappe.whitelist(allow_guest=False, methods=["GET", "POST"])
def update_user_language(language=None):
	"""Update language for current user
	Args:
		language: Language code (e.g., 'id' for Indonesian, 'en' for English)
	"""
	# Try to get language from different sources
	if not language:
		language = frappe.form_dict.get('language')
	
	if not language or language == 'undefined':
		frappe.throw(frappe._("Language is required"))
	
	# Validate that language code exists
	# The Language doctype uses language_code as the primary key (name field)
	if not frappe.db.exists("Language", language):
		frappe.throw(frappe._("Language {0} not found").format(language))
	
	user = frappe.session.user
	
	# Store the language CODE (e.g., "id", "en") not the name (e.g., "Indonesia", "English")
	# Frappe's locale.py expects frappe.local.lang to be a language code
	frappe.db.set_value("User", user, "language", language)
	frappe.db.commit()
	
	# Clear cache to ensure changes take effect
	frappe.clear_cache(user=user)
	
	return {"success": True, "message": "Language updated successfully", "language": language}
